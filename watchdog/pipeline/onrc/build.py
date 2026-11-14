"""The ONRC steps of `pipeline rebuild` (#175): the held snapshots into the `onrc` schema, and ONRC's registrations into `core`.

`build_onrc` reads only the archive (never the network):

- every held snapshot, oldest first, feeds the derived history: `onrc.status_span` and `onrc.name_span` (consecutive snapshots compared in
  SQL, one snapshot staged at a time, so memory does not grow with the number of snapshots). A status in the earliest held snapshot is
  "since at least" it; any other status is "first seen" in the snapshot where it appears;
- the newest readable snapshot also gives `onrc.registration`, `onrc.caen` and `onrc.status_name`;
- a snapshot that does not read (a broken file) is set aside and named in the summary; the history is built from the others.

`OnrcNames` lets the identity resolver ask "does ONRC list this CUI, and under what name" without holding the national register in memory.
`build_onrc_entities` and `build_onrc_placement` run inside the rebuild's entity and placement steps (ADR 0018): every registration whose CUI
is no SEAP counterparty becomes an entity with its own page, placed by the seat's county when no ANAF seat places it.
"""
from __future__ import annotations

import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterator

import psycopg

from ..archive import Archive, Unit
from ..identity import compare_name
from ..placement.tables import load_gazetteer
from . import read
from .fetch import KIND, SOURCE, STREAM

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

    def line(self) -> str:
        if not self.snapshots:
            return "onrc: no snapshot archived (run `pipeline fetch-onrc`)" + "".join(f"; skipped {s}" for s in self.skipped)
        return (f"onrc: {self.snapshots} snapshot(s) {self.first}..{self.latest}, {self.companies} registrations ({self.with_cui} with a CUI), {self.caen} authorised CAEN codes, "
                f"{self.status_spans} status spans, {self.entities_only} ONRC-only entities" + "".join(f"; skipped {s}" for s in self.skipped))


def snapshot_units(archive: Archive) -> list[Unit]:
    """The ONRC units, one per snapshot date (the newest fetch of a re-upload), oldest snapshot first."""
    newest: dict[str, Unit] = {}
    for unit in archive.units(SOURCE):
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

_EXTEND_STATUS = """UPDATE onrc.status_span sp SET last_seen = %(d)s FROM onrc_obs o
    WHERE o.code IS NOT NULL AND sp.reg_no = o.reg_no AND sp.code = o.code AND sp.last_seen = %(prev)s"""
_NEW_STATUS = """INSERT INTO onrc.status_span (reg_no, code, first_seen, last_seen, since_at_least)
    SELECT DISTINCT o.reg_no, o.code, %(d)s, %(d)s, %(first)s FROM onrc_obs o
     WHERE o.code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM onrc.status_span sp WHERE sp.reg_no = o.reg_no AND sp.code = o.code AND sp.last_seen = %(d)s)"""
_EXTEND_NAME = """UPDATE onrc.name_span sp SET last_seen = %(d)s FROM (SELECT DISTINCT reg_no, name FROM onrc_obs) o
    WHERE sp.reg_no = o.reg_no AND sp.name = o.name AND sp.last_seen = %(prev)s"""
_NEW_NAME = """INSERT INTO onrc.name_span (reg_no, name, first_seen, last_seen, since_at_least)
    SELECT o.reg_no, o.name, %(d)s, %(d)s, %(first)s FROM (SELECT DISTINCT reg_no, name FROM onrc_obs) o
     WHERE NOT EXISTS (SELECT 1 FROM onrc.name_span sp WHERE sp.reg_no = o.reg_no AND sp.name = o.name AND sp.last_seen = %(d)s)"""


def _stage_snapshot(cur: psycopg.Cursor, unit: Unit) -> int:
    """The snapshot's (registration, name, status code) rows into the staging table; returns the registrations. Nothing reaches the schema if reading fails."""
    cur.execute(_STAGE)
    cur.execute("TRUNCATE onrc_obs")
    companies = 0
    with cur.copy("COPY onrc_obs (reg_no, name, code) FROM STDIN") as copy:
        for company in read.read_companies(unit):
            companies += 1
            for code in company.states or (None,):  # a company with no status still has a name to date
                copy.write_row((company.reg_no, company.name, code))
    return companies


def _apply_snapshot(cur: psycopg.Cursor, unit: Unit, companies: int, previous: date | None, first: bool, archive: Archive) -> None:
    when = date.fromisoformat(unit.unit)
    origin = unit.origin or {}
    args = {"d": when, "prev": previous or date.min, "first": first}
    for statement in (_EXTEND_STATUS, _NEW_STATUS, _EXTEND_NAME, _NEW_NAME):
        cur.execute(statement, args)
    cur.execute(
        "INSERT INTO onrc.snapshot (snapshot_date, layout, dataset, title, url, fetched_at, archive_path, companies, earliest) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (when, read.layout_of(unit), origin.get("dataset"), origin.get("datasetTitle"), unit.url, unit.fetched_at, str(unit.path.relative_to(archive.root)), companies, first))


def _load_registrations(cur: psycopg.Cursor, unit: Unit, data_dir: Path | str | None) -> tuple[int, int, int]:
    """`onrc.registration`, `onrc.caen` and `onrc.status_name` from one snapshot; returns (registrations, with a CUI, CAEN rows)."""
    gaz, _ = load_gazetteer(data_dir)
    counties: dict[str | None, str | None] = {}

    def county_iso(name: str | None) -> str | None:
        if name not in counties:
            counties[name] = gaz.county_of_name(name) if name else None
        return counties[name]

    when = date.fromisoformat(unit.unit)
    cur.execute("CREATE TEMP TABLE onrc_reg (LIKE onrc.registration INCLUDING DEFAULTS) ON COMMIT DROP")
    n = with_cui = 0
    with cur.copy("COPY onrc_reg (reg_no, cui, primary_for_cui, name, registration_date, legal_form, euid, county_name, county_iso, locality, address, postal_code, snapshot_date) FROM STDIN") as copy:
        for c in read.read_companies(unit):
            n += 1
            with_cui += c.cui is not None
            copy.write_row((c.reg_no, c.cui, False, c.name, c.registration_date, c.legal_form, c.euid, c.county, county_iso(c.county), c.locality, c.address, c.postal_code, when))
    cur.execute("""INSERT INTO onrc.registration
        SELECT DISTINCT ON (reg_no) reg_no, cui, false, name, registration_date, legal_form, euid, county_name, county_iso, locality, address, postal_code, snapshot_date
          FROM onrc_reg ORDER BY reg_no""")
    cur.execute("""UPDATE onrc.registration r SET primary_for_cui = true FROM (SELECT DISTINCT ON (cui) reg_no FROM onrc.registration WHERE cui IS NOT NULL ORDER BY cui, reg_no) p
                    WHERE r.reg_no = p.reg_no""")
    cur.execute("CREATE UNIQUE INDEX registration_cui_primary ON onrc.registration (cui) WHERE primary_for_cui")
    caen = 0
    cur.execute("CREATE TEMP TABLE onrc_caen (LIKE onrc.caen) ON COMMIT DROP")
    with cur.copy("COPY onrc_caen (reg_no, code, version) FROM STDIN") as copy:
        for row in read.read_caen(unit):
            copy.write_row(row)
    cur.execute("INSERT INTO onrc.caen SELECT DISTINCT ON (reg_no, code) reg_no, code, version FROM onrc_caen ORDER BY reg_no, code, version DESC NULLS LAST")
    caen = cur.rowcount
    return n, with_cui, caen


def build_onrc(cur: psycopg.Cursor, archive: Archive, data_dir: Path | str | None = None) -> OnrcSummary:
    summary = OnrcSummary()
    summary.skipped += [f"incomplete unit {p.relative_to(archive.root)}" for p in archive.incomplete(SOURCE)]
    cur.execute("CREATE INDEX name_span_open ON onrc.name_span (last_seen)")
    cur.execute("CREATE INDEX status_span_open ON onrc.status_span (last_seen)")
    held: list[Unit] = []
    previous: date | None = None
    for unit in snapshot_units(archive):
        try:
            with cur.connection.transaction():  # a savepoint: a failed COPY must not abort the rebuild's transaction
                companies = _stage_snapshot(cur, unit)
        except Exception as e:  # noqa: BLE001 - a broken snapshot must not stop the rebuild: the history is built from the others, the summary says so
            summary.skipped.append(f"snapshot {unit.unit} ({unit.path.relative_to(archive.root)}): {e}")
            log.warning("onrc snapshot %s skipped: %s", unit.unit, e)
            continue
        _apply_snapshot(cur, unit, companies, previous, previous is None, archive)
        previous = date.fromisoformat(unit.unit)
        held.append(unit)
        summary.snapshots += 1
    if held:
        summary.first, summary.latest = date.fromisoformat(held[0].unit), date.fromisoformat(held[-1].unit)
        summary.companies, summary.with_cui, summary.caen = _load_registrations(cur, held[-1], data_dir)
        for unit in reversed(held):  # the nomenclature of the newest snapshot that carries one
            if names := read.read_status_names(unit):
                cur.executemany("INSERT INTO onrc.status_name (code, name, snapshot_date) VALUES (%s, %s, %s)", [(c, n, date.fromisoformat(unit.unit)) for c, n in sorted(names.items())])
                break
        cur.execute("SELECT count(*) FROM onrc.status_span")
        summary.status_spans = cur.fetchone()[0]
    cur.execute("DROP TABLE IF EXISTS onrc_obs")
    cur.execute("ANALYZE onrc.registration")
    return summary


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
