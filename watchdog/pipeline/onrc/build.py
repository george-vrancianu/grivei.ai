"""The ONRC steps of `pipeline rebuild` (#175): the held snapshots into the `onrc` schema, and ONRC's registrations into `core`.

`build_onrc` reads only the archive (never the network):

- every held snapshot, oldest first, feeds the derived history: `onrc.status_span` and `onrc.name_span` (consecutive snapshots compared in
  SQL, one snapshot staged at a time, so memory does not grow with the number of snapshots). A status in the earliest held snapshot is
  "since at least" it; any other status is "first seen" in the snapshot where it appears;
- the history is written only where it changes (#304): the spans open in the last applied snapshot live in two working tables
  (`onrc.open_status`, `onrc.open_name`, one row per open span); a snapshot moves the spans it no longer shows into the span tables as closed and adds the
  ones it newly shows to the working tables; `finish_onrc` closes what is still open at the newest snapshot, drops the working tables and adds the span
  tables' primary keys. They are SQL tables, not Python dicts: the register has about 4.6 M open status spans and 4.2 M open name spans (about 9 M together), roughly 2-2.5 GB as Python dicts: over the pipeline
  container's 2 GB `mem_limit`, and close to 4 GB once the parsing is counted, and a table survives the commit of every snapshot, so a rerun after a kill needs no rebuilding;
- the newest readable snapshot also gives `onrc.registration`, `onrc.caen` and `onrc.status_name`;
- a snapshot that does not read (a broken file) is set aside and named in the summary; the history is built from the others;
- a staged build commits after every snapshot, with its `build.snapshot` row (`build_onrc_snapshots`), and a rerun after a kill continues from the next snapshot; `finish_onrc` does the work that needs all of them (#294).

`OnrcNames` lets the identity resolver ask "does ONRC list this CUI, and under what name" without holding the national register in memory.
`build_onrc_entities` and `build_onrc_placement` run inside the rebuild's entity and placement steps (ADR 0018): every registration whose CUI
is no SEAP counterparty becomes an entity with its own page, placed by the seat's county when no ANAF seat places it.
Provenance follows ADR 0018, not the ticket's wording: an ONRC-only registration whose CUI ANAF happens to know gets provenance ANAF; ONRC provenance is for CUIs ANAF does not know.
"""
from __future__ import annotations

import logging
import os
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator

import psycopg

from ..analyze import analyze, local_work_mem
from ..archive import Archive, Unit
from ..identity import compare_name
from ..stop import pause_point
from ..placement.tables import load_gazetteer
from . import read
from .people import PeopleSummary, PersonOverrides, build_people, has_people
from .fetch import KIND, SOURCE, STREAM
from .status import missing_months

log = logging.getLogger("pipeline.onrc")


@dataclass
class OnrcSummary:
    snapshots: int = 0
    first: date | None = None
    latest: date | None = None
    companies: int = 0  # registrations of the newest snapshot
    with_cui: int = 0  # of them, with a CUI that passes the check digit
    caen: int = 0
    status_spans: int = 0
    skipped: list[str] = field(default_factory=list)  # snapshots that did not read, and incomplete units
    entities_only: int = 0  # registrations that became an entity because no SEAP Record names the CUI
    people: PeopleSummary = field(default_factory=PeopleSummary)  # the roles of the newest snapshot with a people file (#177)
    coverage_cells: int = 0  # Coverage grid cells: one per snapshot, one per missing month since March 2026 (#176)

    def __post_init__(self) -> None:
        self._registrations_staged = False  # the snapshot loop left the newest snapshot's registrations in `onrc_reg_newest` (a temp table of the connection; not persisted)
        self._held: list[Unit] = []  # working state between the snapshot loop and `finish_onrc`: the applied snapshots, oldest first (not a field: never persisted)

    def line(self) -> str:
        if not self.snapshots:
            return "onrc: no snapshot archived (run `pipeline fetch-onrc`)" + "".join(f"; skipped {s}" for s in self.skipped)
        return (f"onrc: {self.snapshots} snapshot(s) {self.first}..{self.latest}, {self.companies} registrations ({self.with_cui} with a CUI), {self.caen} authorised CAEN codes, "
                f"{self.status_spans} status spans, {self.entities_only} ONRC-only entities" + (f", people: {self.people.line()}" if self.people.snapshot else "")
                + "".join(f"; skipped {s}" for s in self.skipped))


def snapshot_units(units: list[Unit]) -> list[Unit]:
    """One unit per snapshot date (the newest fetch of a re-upload), oldest snapshot first. Takes the already-read ONRC units: reading hashes every file."""
    newest: dict[str, Unit] = {}
    for unit in units:
        if (unit.source, unit.stream, unit.kind) != (SOURCE, STREAM, KIND):
            continue
        try:
            date.fromisoformat(unit.unit)
        except ValueError:
            continue  # a stray directory is no snapshot
        if unit.unit not in newest or (unit.fetched_at, str(unit.path)) > (newest[unit.unit].fetched_at, str(newest[unit.unit].path)):
            newest[unit.unit] = unit
    return [newest[d] for d in sorted(newest)]


_STAGE = "CREATE TEMP TABLE IF NOT EXISTS onrc_obs (reg_no text, name text, code integer)"
_STAGE_NEWEST = "CREATE TEMP TABLE onrc_reg_newest (LIKE onrc.registration INCLUDING DEFAULTS)"  # the newest snapshot's registrations, parsed in the same pass as its spans

# The working state: one row per span open in the last applied snapshot (every open span was seen there, so its `last_seen` is that snapshot's date and is not stored).
_OPEN = ("CREATE TABLE IF NOT EXISTS onrc.open_status (reg_no text NOT NULL, code integer NOT NULL, first_seen date NOT NULL, since_at_least boolean NOT NULL, PRIMARY KEY (reg_no, code))",
         "CREATE TABLE IF NOT EXISTS onrc.open_name (reg_no text NOT NULL, name text NOT NULL, first_seen date NOT NULL, since_at_least boolean NOT NULL, PRIMARY KEY (reg_no, name))")
# The span tables are filled without their primary keys; `finish_onrc` adds them back (same names as the DDL's own).
_SPAN_KEYS = (("onrc.status_span", "status_span_pkey", "(reg_no, code, first_seen)"), ("onrc.name_span", "name_span_pkey", "(reg_no, name, first_seen)"))

# The columns of `onrc.registration` that a snapshot's registration row carries, in the order of `_registration_row`.
_REG_COLUMNS = "reg_no, cui, primary_for_cui, name, registration_date, legal_form, euid, county_name, county_iso, locality, address, postal_code, snapshot_date"

# A snapshot closes the open spans it no longer shows (the only rows written to the span tables) and opens the spans it newly shows.
_CLOSE_STATUS = """WITH closed AS (DELETE FROM onrc.open_status o
        WHERE NOT EXISTS (SELECT 1 FROM onrc_obs b WHERE b.code IS NOT NULL AND b.reg_no = o.reg_no AND b.code = o.code)
        RETURNING o.reg_no, o.code, o.first_seen, o.since_at_least)
    INSERT INTO onrc.status_span (reg_no, code, first_seen, last_seen, since_at_least) SELECT reg_no, code, first_seen, %(prev)s, since_at_least FROM closed"""
_OPEN_STATUS = """INSERT INTO onrc.open_status (reg_no, code, first_seen, since_at_least)
    SELECT DISTINCT b.reg_no, b.code, %(d)s, %(first)s FROM onrc_obs b
     WHERE b.code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM onrc.open_status o WHERE o.reg_no = b.reg_no AND o.code = b.code)"""
_CLOSE_NAME = """WITH closed AS (DELETE FROM onrc.open_name o
        WHERE NOT EXISTS (SELECT 1 FROM onrc_obs b WHERE b.reg_no = o.reg_no AND b.name = o.name)
        RETURNING o.reg_no, o.name, o.first_seen, o.since_at_least)
    INSERT INTO onrc.name_span (reg_no, name, first_seen, last_seen, since_at_least) SELECT reg_no, name, first_seen, %(prev)s, since_at_least FROM closed"""
_OPEN_NAME = """INSERT INTO onrc.open_name (reg_no, name, first_seen, since_at_least)
    SELECT b.reg_no, b.name, %(d)s, %(first)s FROM (SELECT DISTINCT reg_no, name FROM onrc_obs) b
     WHERE NOT EXISTS (SELECT 1 FROM onrc.open_name o WHERE o.reg_no = b.reg_no AND o.name = b.name)"""


def _prepare_history(cur: psycopg.Cursor) -> None:
    """The working tables, and the span tables without their primary keys, for the fill. Safe to repeat: a rerun after a kill finds both as the last commit left them."""
    for table, key, _ in _SPAN_KEYS:
        cur.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {key}")
    for statement in _OPEN:
        cur.execute(statement)


def _finish_history(cur: psycopg.Cursor, last: date | None) -> None:
    """Close what is still open at the newest applied snapshot `last`, drop the working tables, add the primary keys the fill left off."""
    if last is not None:
        cur.execute("INSERT INTO onrc.status_span (reg_no, code, first_seen, last_seen, since_at_least) SELECT reg_no, code, first_seen, %s, since_at_least FROM onrc.open_status", (last,))
        cur.execute("INSERT INTO onrc.name_span (reg_no, name, first_seen, last_seen, since_at_least) SELECT reg_no, name, first_seen, %s, since_at_least FROM onrc.open_name", (last,))
    cur.execute("DROP TABLE IF EXISTS onrc.open_status, onrc.open_name")
    for table, key, columns in _SPAN_KEYS:
        cur.execute(f"ALTER TABLE {table} ADD CONSTRAINT {key} PRIMARY KEY {columns}")


def _stage_snapshot(cur: psycopg.Cursor, unit: Unit, keep_registrations: bool = False) -> int:
    """The snapshot's (registration, name, status code) rows into the staging table; returns the registrations. Nothing reaches the schema if reading fails.
    `keep_registrations` (the newest snapshot) stages the registrations in the same pass, for `finish_onrc`: the snapshot is parsed once."""
    cur.execute(_STAGE)
    cur.execute("TRUNCATE onrc_obs")
    when = date.fromisoformat(unit.unit)
    companies = 0
    if not keep_registrations:
        with cur.copy("COPY onrc_obs (reg_no, name, code) FROM STDIN (FREEZE)") as copy:
            for company in read.read_companies(unit):
                companies += 1
                for code in company.states or (None,):  # a company with no status still has a name to date
                    copy.write_row((company.reg_no, company.name, code))
        cur.execute("ANALYZE onrc_obs")  # a temp table is never analyzed by autovacuum: the anti-joins below plan from these statistics
        return companies
    # One COPY (a connection carries one at a time) feeds both: a company's (name, status) rows, and one row with its registration, told apart by `is_reg`.
    cur.execute("DROP TABLE IF EXISTS onrc_reg_newest, onrc_wide")
    cur.execute(_STAGE_NEWEST)
    cur.execute("CREATE TEMP TABLE onrc_wide (LIKE onrc.registration INCLUDING DEFAULTS, code integer, is_reg boolean NOT NULL)")
    with cur.copy(f"COPY onrc_wide ({_REG_COLUMNS}, code, is_reg) FROM STDIN (FREEZE)") as copy:
        for company in read.read_companies(unit):
            companies += 1
            for code in company.states or (None,):
                copy.write_row((company.reg_no, None, False, company.name, None, None, None, None, None, None, None, None, when, code, False))
            copy.write_row(_registration_row(company, when) + (None, True))
    cur.execute("INSERT INTO onrc_obs (reg_no, name, code) SELECT reg_no, name, code FROM onrc_wide WHERE NOT is_reg")
    cur.execute(f"INSERT INTO onrc_reg_newest SELECT {_REG_COLUMNS} FROM onrc_wide WHERE is_reg")
    cur.execute("DROP TABLE onrc_wide")
    cur.execute("ANALYZE onrc_obs")
    cur.execute("ANALYZE onrc_reg_newest")
    return companies


def _apply_snapshot(cur: psycopg.Cursor, unit: Unit, companies: int, previous: date | None, first: bool, archive: Archive) -> None:
    when = date.fromisoformat(unit.unit)
    origin = unit.origin or {}
    args = {"d": when, "prev": previous or date.min, "first": first}
    for statement in (_CLOSE_STATUS, _OPEN_STATUS, _CLOSE_NAME, _OPEN_NAME):
        cur.execute(statement, args)
    if first:
        analyze(cur, "onrc.open_status", "onrc.open_name")  # the first snapshot fills them: later statements plan from their size
    cur.execute(
        "INSERT INTO onrc.snapshot (snapshot_date, layout, dataset, title, url, fetched_at, archive_path, companies, earliest) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (when, read.layout_of(unit), origin.get("dataset"), origin.get("datasetTitle"), unit.url, unit.fetched_at, str(unit.path.relative_to(archive.root)), companies, first))


_COPY_REGISTRATIONS = f"COPY onrc_reg_newest ({_REG_COLUMNS}) FROM STDIN (FREEZE)"


def _registration_row(c: read.Company, when: date) -> tuple:
    return (c.reg_no, c.cui, False, c.name, c.registration_date, c.legal_form, c.euid, c.county, None, c.locality, c.address, c.postal_code, when)  # county_iso is looked up at the load


def _load_registrations(cur: psycopg.Cursor, unit: Unit, data_dir: Path | str | None, staged: bool = False) -> tuple[int, int, int]:
    """`onrc.registration`, `onrc.caen` and `onrc.status_name` from one snapshot; returns (registrations, with a CUI, CAEN rows). `staged`: the snapshot loop already
    put this snapshot's registrations in `onrc_reg_newest`; otherwise (a rerun that found the newest snapshot committed) it is read here."""
    gaz, _ = load_gazetteer(data_dir)
    if not staged:
        when = date.fromisoformat(unit.unit)
        cur.execute("DROP TABLE IF EXISTS onrc_reg_newest")
        cur.execute(_STAGE_NEWEST)
        with cur.copy(_COPY_REGISTRATIONS) as copy:
            for c in read.read_companies(unit):
                copy.write_row(_registration_row(c, when))
    cur.execute("SELECT count(*), count(cui) FROM onrc_reg_newest")
    n, with_cui = cur.fetchone()
    cur.execute("SELECT DISTINCT county_name FROM onrc_reg_newest WHERE county_name IS NOT NULL AND county_name <> ''")
    counties = sorted(name for (name,) in cur.fetchall())
    cur.execute("""INSERT INTO onrc.registration
        SELECT DISTINCT ON (r.reg_no) r.reg_no, r.cui, false, r.name, r.registration_date, r.legal_form, r.euid, r.county_name, m.iso, r.locality, r.address, r.postal_code, r.snapshot_date
          FROM onrc_reg_newest r LEFT JOIN unnest(%s::text[], %s::text[]) AS m(county, iso) ON m.county = r.county_name ORDER BY r.reg_no""",
                (counties, [gaz.county_of_name(name) for name in counties]))
    cur.execute("""UPDATE onrc.registration r SET primary_for_cui = true FROM (SELECT DISTINCT ON (cui) reg_no FROM onrc.registration WHERE cui IS NOT NULL ORDER BY cui, reg_no) p
                    WHERE r.reg_no = p.reg_no""")
    cur.execute("CREATE UNIQUE INDEX registration_cui_primary ON onrc.registration (cui) WHERE primary_for_cui")
    caen = 0
    cur.execute("CREATE TEMP TABLE onrc_caen (LIKE onrc.caen) ON COMMIT DROP")
    with cur.copy("COPY onrc_caen (reg_no, code, version) FROM STDIN (FREEZE)") as copy:
        for row in read.read_caen(unit):
            copy.write_row(row)
    cur.execute("INSERT INTO onrc.caen SELECT DISTINCT ON (reg_no, code) reg_no, code, version FROM onrc_caen ORDER BY reg_no, code, version DESC NULLS LAST")
    caen = cur.rowcount
    return n, with_cui, caen


def _store_coverage(cur: psycopg.Cursor, held: list[date]) -> int:
    """`onrc.coverage_cell` (#176): one LOADED cell per snapshot read and one KNOWN_GAP cell per calendar month since March 2026 with none (the monthly
    snapshots the birth dates and the status dates rest on, see `status.missing_months`). A snapshot that did not read is as if it were not held. Returns the cells."""
    cur.execute("INSERT INTO onrc.coverage_cell (period, period_start, period_end, kind, state, records, data_through) "
                "SELECT snapshot_date::text, snapshot_date, snapshot_date, 'REGISTRATION', 'LOADED', companies, snapshot_date FROM onrc.snapshot")
    cells = len(held)
    for month in missing_months(held):
        first = date.fromisoformat(f"{month}-01")
        last = date(first.year + (first.month == 12), first.month % 12 + 1, 1) - timedelta(days=1)
        cur.execute("INSERT INTO onrc.coverage_cell (period, period_start, period_end, kind, state, records, data_through) VALUES (%s, %s, %s, 'REGISTRATION', 'KNOWN_GAP', 0, NULL)", (month, first, last))
        cells += 1
    return cells


def _after_snapshot(unit: Unit) -> None:
    """Called once a snapshot's transaction has ended (committed, in a staged build). Does nothing; the place a test kills the build after a snapshot (the pause check follows it)."""


def _committed_snapshots(cur: psycopg.Cursor) -> list[tuple[date, bool, str | None]]:
    """(date, applied, why it was set aside) of the snapshots an earlier run of this Step committed, in loop order."""
    cur.execute("SELECT snapshot_date, applied, skipped FROM build.snapshot ORDER BY ordinal")
    return cur.fetchall()


def build_onrc_snapshots(cur: psycopg.Cursor, archive: Archive, work_mem: str | None = None) -> OnrcSummary:
    """The first part of the `onrc` Step: every snapshot not yet committed, oldest first, each in a transaction of its own with its `build.snapshot` row. On a
    staged connection (autocommit) each is a real commit, so a failure loses at most one snapshot and a rerun continues with the next; under the one
    `--in-place` transaction each is a savepoint; `work_mem` is set for the statements of each snapshot's transaction only. Returns the summary so far; `finish_onrc` completes it."""
    summary = OnrcSummary()
    surveyed = archive.survey(lambda d: d.relative_to(archive.root).parts[0] == SOURCE)  # one pass: the files are hashed once per rebuild
    summary.skipped += [f"incomplete unit {p.relative_to(archive.root)}" for u, p in surveyed if u is None]
    _prepare_history(cur)
    units = snapshot_units([u for u, _ in surveyed if u is not None])
    newest = units[-1] if units else None  # known before the loop: its registrations are staged with its spans, so it is parsed once
    committed = _committed_snapshots(cur)  # a rerun after a kill inside this Step
    done = {d for d, _, _ in committed}
    applied = {d for d, ok, _ in committed if ok}
    previous: date | None = max(applied, default=None)
    summary.skipped += [why for _, ok, why in committed if not ok]
    ordinal = len(committed)
    for unit in units:
        when = date.fromisoformat(unit.unit)
        if when in done:
            continue
        ordinal += 1
        with cur.connection.transaction():  # the snapshot's commit: its spans and its ledger row together
            with local_work_mem(cur, work_mem):
                try:
                    with cur.connection.transaction():  # a savepoint: a failed COPY must not abort the snapshot's transaction
                        companies = _stage_snapshot(cur, unit, keep_registrations=unit is newest)
                except Exception as e:  # noqa: BLE001 - a broken snapshot must not stop the rebuild: the history is built from the others, the summary says so
                    message = f"snapshot {unit.unit} ({unit.path.relative_to(archive.root)}): {str(e).replace(os.fspath(archive.root) + os.sep, '')}"  # no absolute path: the row is part of the graph, equal in every build of the same archive
                    summary.skipped.append(message)
                    log.warning("onrc snapshot %s skipped: %s", unit.unit, e)
                    cur.execute("INSERT INTO build.snapshot (snapshot_date, ordinal, applied, skipped) VALUES (%s, %s, false, %s)", (when, ordinal, message))
                else:
                    _apply_snapshot(cur, unit, companies, previous, previous is None, archive)
                    cur.execute("INSERT INTO build.snapshot (snapshot_date, ordinal, applied, skipped) VALUES (%s, %s, true, NULL)", (when, ordinal))
                    previous = when
                    applied.add(when)
                    summary._registrations_staged = unit is newest
        _after_snapshot(unit)
        pause_point(cur, f"after ONRC snapshot {unit.unit}")  # a staged build only; the hook above is what a test patches
    summary._held = [u for u in units if date.fromisoformat(u.unit) in applied]
    summary.snapshots = len(applied)
    return summary


def finish_onrc(cur: psycopg.Cursor, summary: OnrcSummary, data_dir: Path | str | None = None, person_overrides: PersonOverrides | None = None) -> OnrcSummary:
    """The second part of the `onrc` Step, in the Step's own transaction (with its `build.step` row): what needs every snapshot (Coverage cells, the newest
    snapshot's registrations, the status nomenclature, the people), computed from the held snapshots and the tables, so a resumed Step gives the summary
    of an uninterrupted one. Runs only after `build_onrc_snapshots` (the held snapshots ride on its summary); any other summary raises."""
    held = summary._held
    if summary.snapshots != len(held):
        raise RuntimeError(f"finish_onrc needs the summary of build_onrc_snapshots: {summary.snapshots} snapshot(s) counted, {len(held)} held")
    if held:
        summary.first, summary.latest = date.fromisoformat(held[0].unit), date.fromisoformat(held[-1].unit)
        summary.coverage_cells = _store_coverage(cur, [date.fromisoformat(u.unit) for u in held])
        _finish_history(cur, summary.latest)
        cur.execute("SELECT to_regclass('pg_temp.onrc_reg_newest') IS NOT NULL")
        staged = summary._registrations_staged and cur.fetchone()[0]
        summary.companies, summary.with_cui, summary.caen = _load_registrations(cur, held[-1], data_dir, staged=staged)
        for unit in reversed(held):  # the nomenclature of the newest snapshot that carries one
            if names := read.read_status_names(unit):
                cur.executemany("INSERT INTO onrc.status_name (code, name, snapshot_date) VALUES (%s, %s, %s)", [(c, n, date.fromisoformat(unit.unit)) for c, n in sorted(names.items())])
                break
        cur.execute("SELECT count(*) FROM onrc.status_span")
        summary.status_spans = cur.fetchone()[0]
        # the roles of the newest snapshot that carries the people files (#177; older snapshots have none): needs the person-id secret when there are any
        summary.people = build_people(cur, next((u for u in reversed(held) if has_people(u)), None), person_overrides)
        if summary.people.snapshot:  # the ROLE Coverage cell: roles are loaded from this one snapshot only (older ones have no people files), so there is one cell and no gap months
            cur.execute("INSERT INTO onrc.coverage_cell (period, period_start, period_end, kind, state, records, data_through) "
                        "SELECT snapshot_date::text, snapshot_date, snapshot_date, 'ROLE', 'LOADED', count(*), snapshot_date FROM onrc.role GROUP BY snapshot_date")
            summary.coverage_cells += cur.rowcount
    else:
        _finish_history(cur, None)
    cur.execute("DROP TABLE IF EXISTS onrc_obs, onrc_reg_newest")
    analyze(cur, "onrc.snapshot", "onrc.registration", "onrc.status_span", "onrc.name_span", "onrc.caen", "onrc.status_name", "onrc.role")
    return summary


def build_onrc(cur: psycopg.Cursor, archive: Archive, data_dir: Path | str | None = None, person_overrides: PersonOverrides | None = None) -> OnrcSummary:
    """Both parts in the caller's transaction (what the rebuild's `onrc` Step runs as two, `Step.segments` and `run`)."""
    return finish_onrc(cur, build_onrc_snapshots(cur, archive), data_dir, person_overrides)


class OnrcNames(Mapping):
    """CUI -> compare name for the identity resolver: ANAF's answers first, then ONRC's registrations (ADR 0018: ONRC confirms a CUI ANAF does not know).

    ONRC's side is read from `onrc.registration` on demand (one indexed lookup per CUI, cached), not held in memory: the register has millions of rows and
    a rebuild asks about the few hundred thousand CUIs SEAP names. `cur` must be a cursor of its own: the resolver asks in the middle of the Record load."""

    def __init__(self, cur: psycopg.Cursor, anaf: Mapping[str, str]):
        self.cur, self.anaf, self._cache = cur, anaf, {}

    def _onrc(self, cui: str) -> str | None:
        if cui not in self._cache:
            self.cur.execute("SELECT name FROM onrc.registration WHERE cui = %s AND primary_for_cui", (cui,))
            row = self.cur.fetchone()
            self._cache[cui] = compare_name(row[0]) if row else None
        return self._cache[cui]

    def prefetch(self, cuis: Iterable[str]) -> None:
        """Ask ONRC about all these CUIs in one statement and cache the answers, absent ones as None (what `_onrc` caches), so resolving a unit's Records
        after it asks nothing. CUIs ANAF knows or already cached are left out."""
        missing = sorted(c for c in set(cuis) if c.isdigit() and c not in self._cache and c not in self.anaf)
        if not missing:
            return
        self.cur.execute("SELECT cui, name FROM onrc.registration WHERE cui = ANY(%s) AND primary_for_cui", (missing,))
        found = {cui: name for cui, name in self.cur.fetchall()}
        for cui in missing:
            self._cache[cui] = compare_name(found[cui]) if cui in found else None

    def __getitem__(self, cui: str) -> str:
        if cui in self.anaf:
            return self.anaf[cui]
        name = self._onrc(cui) if isinstance(cui, str) and cui.isdigit() else None
        if name is None:
            raise KeyError(cui)
        return name

    def __iter__(self) -> Iterator[str]:
        return iter(self.anaf)

    def __len__(self) -> int:
        return len(self.anaf)

    def __contains__(self, cui: object) -> bool:
        try:
            self[cui]  # type: ignore[index]
        except KeyError:
            return False
        return True


def build_onrc_entities(cur: psycopg.Cursor, pinned: list[str]) -> int:
    """An entity for every registration whose CUI no SEAP Record named (ADR 0018): ANAF's name and status when ANAF has the CUI, else ONRC's name
    with the provenance ONRC. `pinned` are the CUIs an identity override re-keys: the override wins, so they get no ONRC-keyed entity. Returns the count."""
    cur.execute(
        """INSERT INTO core.entity (key, identity, cui, foreign_vat_id, display_name, anaf_status, identity_curated, provenance_source, provenance_via, fetched_at)
           SELECT r.cui, 'CUI', r.cui, NULL, coalesce(a.name, nullif(r.name, ''), r.cui), a.status, false,
                  CASE WHEN a.cui IS NOT NULL THEN 'ANAF' ELSE 'ONRC' END, CASE WHEN a.cui IS NULL THEN r.snapshot_date::text END,
                  coalesce(a.fetched_at, s.fetched_at)
             FROM onrc.registration r JOIN onrc.snapshot s ON s.snapshot_date = r.snapshot_date
             LEFT JOIN core.anaf_company a ON a.cui = r.cui
            WHERE r.primary_for_cui AND NOT EXISTS (SELECT 1 FROM core.entity e WHERE e.key = r.cui) AND r.cui <> ALL(%s)""", (pinned,))
    return cur.rowcount


def build_onrc_placement(cur: psycopg.Cursor) -> int:
    """The seat's county places an entity ANAF and SEAP did not place (the UAT stays ANAF's: an ANAF-placed entity keeps its row). Returns the rows added."""
    cur.execute(
        """INSERT INTO core.placement (entity_key, county_iso, uat_siruta, village_siruta, sector, national, national_by, placed_by, located_on, source_path)
           SELECT e.key, r.county_iso, NULL, NULL, NULL, false, 'default', 'ONRC', s.fetched_at, s.archive_path
             FROM core.entity e JOIN onrc.registration r ON r.cui = e.key AND r.primary_for_cui
             JOIN onrc.snapshot s ON s.snapshot_date = r.snapshot_date
            WHERE r.county_iso IS NOT NULL AND e.identity = 'CUI' AND NOT EXISTS (SELECT 1 FROM core.placement p WHERE p.entity_key = e.key)""")
    return cur.rowcount
