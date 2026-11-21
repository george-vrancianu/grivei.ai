"""`pipeline rebuild`: derive the graph from the raw archive into a fresh `seap` schema (ADR 0004).

Reads only units with a complete manifest, oldest fetch first, and loads each unit all or nothing (SEAP bulk files of
every registered kind: DA, DAN, contracte, fara-anunt). A unit that fails validation is moved to the quarantine area with
a reason file and loads nothing. An in-place rebuild (without `--staged`) is one transaction, so a failed or killed one leaves the previous
schema in place and nothing half-loaded; a staged one (beside the live graph) commits after every Step into its own next database, where a failure leaves a
partial graph nothing serves, and the next run resumes it after the last committed Step when the pinned inputs and the code are unchanged (resume.py, pins.py),
else rebuilds it; an in-place build is rerun from scratch unless it is `--in-place --staged` (#297: the target database itself holds the ledger). The same archive always gives the same database, resumed or not.

The rebuild's steps are declared in build_steps.py (`STEPS`, each with the tables it reads and writes and the code it owns); `rebuild()` runs them in order.

Units are read and loaded one at a time, so memory holds one quarter's rows, not the archive's. Each unit reports to a
`Progress` (log line and status file, see progress.py).

Identity (ADR 0003): before the SEAP files, the archived ANAF answers (`pipeline anaf-lookup` archives them; a rebuild never
calls ANAF) go into `core.anaf_company`. Each Record's authority and winners are resolved to entity keys while it loads
(identity.py), and after the last unit `core.entity` and `core.alias` are built from the loaded Records. A 13-digit CNP
is recognised before anything is stored: the winner becomes a natural-person supplier with no name and no key in the graph the
API reads. A natural person's published name (never a CNP) is kept apart in `withheld.natural_person_name`, which nothing serves
(ADR 0003 as amended 2026-11-12: names wait for the Naming threshold and ADR 0009's Go-live conditions).

A file that switches kind partway (bulk/records.py: rows of its own kind, then another kind's export pasted in) loads its leading
rows; the tail is set aside, kept as a load note on its `seap.source_file` row and reported in the summary, never loaded.

A re-uploaded file loads like any file and per-identity precedence decides (ADR 0002, 2026-11-11 amendment): the later
notice publication wins, an older re-upload cannot overwrite newer data, and a quarter is never replaced wholesale, so
records absent from a re-upload are kept.
"""
from __future__ import annotations

import json
import logging
from contextlib import nullcontext
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, Iterator, Sequence

import psycopg
from psycopg.conninfo import conninfo_to_dict
from psycopg.types.json import Jsonb

from .analyze import analyze
from .anaf import iter_companies
from .archive import QUARANTINE_DIR, Archive, Unit, sha256_of
from .bulk import KINDS, BulkRecord, InvalidFile, SetAside, parse_file_stats
from .counting import Estimate, count
from .coverage import parse_quarter as _parse_quarter
from .crawl import KIND as CRAWL_KIND
from .crawl.records import parse_unit as parse_crawl_unit
from .crawl.unitdir import BACKFILL_KIND
from .fold import fold
from .identity import DEFAULT_OVERRIDES, Overrides, Resolved, Resolver, compare_name, resolve_authority, withheld_name
from .mf.build import MfSummary
from .onrc.people import PersonOverrides
from .onrc.build import OnrcSummary, build_onrc_entities
from .onrc.search import SearchSummary as OnrcSearchSummary, vacuum as vacuum_onrc_search
from .amepip.build import AmepipSummary
from .aep.build import AepSummary
from .financials.build import FinancialsSummary
from .banipartide.build import DonationsSummary
from .placement.build import PlacementSummary
from .build_ledger import record_code_change
from .pins import SQL_DIR, compute_pins, pin_extra
from .progress import Progress
from .stop import STOP, BuildPaused, staged_build
from .resume import Verdict, decide
from .hand_offs import load_data_through, unit_counts
from .sources import SEAP, SOURCES
from .search import value_bucket, vacuum

log = logging.getLogger("pipeline.rebuild")

CORE_SQL = SQL_DIR / "core_schema.sql"
WITHHELD_SQL = SQL_DIR / "withheld_schema.sql"
AMEPIP_SQL = SQL_DIR / "amepip_schema.sql"
AEP_SQL = SQL_DIR / "aep_schema.sql"
FINANCIALS_SQL = SQL_DIR / "financials_schema.sql"
DONATIONS_SQL = SQL_DIR / "donations_schema.sql"
MAINTENANCE_WORK_MEM = "1GB"  # the build session's index builds (ParadeDB's guidance for the BM25 build: around 1 GB); the session's own (a connect option, so no statement opens the in-place outer transaction early), no server-wide change
BUILD_SQL = SQL_DIR / "build_schema.sql"  # the Steps' hand-offs (pipeline/hand_offs.py)


@dataclass
class RebuildSummary:
    files_loaded: int = 0
    pinned_view: Archive | None = field(default=None, repr=False, compare=False)  # the pinned archive view the build read (and quarantined into): what this load covered, for the refresh's load marker
    units_total: int = 0  # the units the loop planned (not printed; a resume gives the progress file this total)
    records: int = 0
    anaf_found: int = 0  # CUIs the archived ANAF answers confirm
    anaf_not_found: int = 0  # CUIs ANAF was asked about and does not know
    estimates: int = 0  # archived estimated-value answers the counting rule read (`pipeline estimates`)
    estimates_missing: int = 0  # notices with a Record of 1 bn RON or more and no archived answer yet
    entities: int = 0
    signals: dict[str, int] = field(default_factory=dict)  # Signals found per rule (#74)
    placement: PlacementSummary | None = None
    mf: MfSummary | None = None  # the MF list step (#80)
    onrc: OnrcSummary | None = None  # the ONRC step (#175)
    onrc_search: OnrcSearchSummary | None = None  # ONRC's search table (#176)
    amepip: AmepipSummary | None = None  # the AMEPIP public-enterprise list step (#183)
    aep: AepSummary | None = None  # AEP's Mandates, Leadership list and Party per Record (#180)
    financials: FinancialsSummary | None = None  # the MF annual financial statements step (#179)
    donations: DonationsSummary | None = None  # the BaniPartide firm donations step (#182)
    geo_line: str | None = None  # the TopoJSON step's one line
    coverage: list[str] = field(default_factory=list)  # the Coverage grid's flagged cells (#79): possibly incomplete, not yet loaded, hand-entered gaps
    duplicate_files: list[Path] = field(default_factory=list)  # byte-identical to a file already planned: nothing to load
    set_aside: list[tuple[Path, SetAside]] = field(default_factory=list)  # a file that switches kind partway: its tail, not loaded
    set_aside_without_gap: list[Path] = field(default_factory=list)  # of them, those whose cell has no hand-entered known gap yet
    quarantined: list[Path] = field(default_factory=list)
    incomplete: list[Path] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"loaded {self.records} records from {self.files_loaded} file(s)"]
        out.append(f"estimates: {self.estimates} archived answers read; {self.estimates_missing} notice(s) of 1 bn RON or more have none yet"
                   + ("; run `pipeline estimates`, then rebuild again" if self.estimates_missing else ""))
        out.append(f"anaf: {self.anaf_found} CUIs found, {self.anaf_not_found} not found (from the archived answers); {self.entities} entities")
        if self.signals:
            out.append("signals: " + ", ".join(f"{rule} {n}" for rule, n in self.signals.items()))
        if self.placement is not None:
            out.append(self.placement.line())
        if self.mf is not None:
            out.append(self.mf.line())
        if self.onrc is not None:
            out.append(self.onrc.line())
        if self.onrc_search is not None:
            out.append(self.onrc_search.line())
        if self.amepip is not None:
            out.append(self.amepip.line())
        if self.aep is not None:
            out.append(self.aep.line())
        if self.financials is not None:
            out.append(self.financials.line())
        if self.donations is not None:
            out.append(self.donations.line())
        if self.geo_line:
            out.append(self.geo_line)
        out += [f"skipped, same file already loaded: {p}" for p in self.duplicate_files]
        out += [f"set aside, not loaded: {p}: from line {a.line} a {a.kind} export ({a.rows} rows) inside the file; its own rows load"
                f"{f' (the last published {a.last_published})' if a.last_published else ''}"
                + ("; its cell has no known gap yet: add one to known_gaps.csv" if p in self.set_aside_without_gap else "; its cell is a known gap")
                for p, a in self.set_aside]
        out += self.coverage
        out += [f"quarantined: {p}" for p in self.quarantined]
        out += [f"skipped, incomplete (no valid manifest): {p}" for p in self.incomplete]
        return out


DATA_THROUGH_SQL = SEAP.data_through_sql  # SEAP's data-through date per Record kind (defined in sources.py, where `pipeline status` and the API's `sources` share it)


def store_sources(cur: psycopg.Cursor) -> None:
    """`core.source`: the registry (sources.py) as the API reads it. Rebuilt with every graph, so the table never disagrees with the code that built it."""
    for position, s in enumerate(SOURCES):
        cur.execute(
            "INSERT INTO core.source (id, position, name, schema_name, record_kinds, lenses, placement_rule, methodology_anchor, landing_status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (s.id, position, s.name, s.schema, list(s.record_kinds), list(s.lenses), s.placement_rule, s.methodology_anchor, s.landing_row.status))


def store_data_through(cur: psycopg.Cursor) -> dict[str, str]:
    """`core.data_through`: every Source's data-through date per record kind, from its registry SQL, in the load transaction (the API reads these rows
    instead of aggregating whole tables). Returns SEAP's dates as the signals and the status file take them."""
    seap: dict[str, str] = {}
    for s in SOURCES:
        cur.execute(s.data_through_sql)
        rows = cur.fetchall()
        for kind, through in rows:
            cur.execute("INSERT INTO core.data_through (source, kind, through) VALUES (%s, %s, %s)", (s.id, kind, through))
        if s is SEAP:
            seap = dict(rows)
    return seap


def _quarter_label(unit: str) -> str:
    """The archive's `2022Q2` as the Coverage grid writes it, `2022-Q2`."""
    year, quarter = _parse_quarter(unit)
    return f"{year}-Q{quarter}"


def _search_doc(r: BulkRecord, authority: Resolved, winners: list[tuple[str | None, Resolved]]) -> str:
    """The folded text of a Record for search. A natural person's name and id never reach it; a winner's id is its CUI (when
    ANAF confirmed it) or its foreign VAT id, never the raw published id."""
    parts = [r.title, r.authority_name, r.cpv_code, r.cpv_description, r.code, authority.cui]
    for name, resolved in winners:
        if not resolved.natural_person:
            parts += [name, resolved.cui, resolved.foreign_vat_id]
    return fold(" ".join(p for p in parts if p))


# The columns whose change means "different content". Not source_file_id: the same Record from a re-uploaded copy is no change.
_CONTENT = (
    "kind", "channel", "title", "state", "authority_cui", "authority_key", "authority_name", "supplier_cui", "supplier_name", "cpv_code",
    "cpv_description", "contract_type", "published_on", "quarter", "award_date", "estimated_bani", "value_bani",
    "counted_bani", "ceiling_bani", "suspect", "framework_role", "suspect_rule", "suspect_threshold_bani", "load_notes", "winners", "badges", "notice_code", "contract_numbers", "procedure", "concluded_by",
    "initiation_code", "lot_count", "via", "url", "ca_notice_id", "sys_notice_type_id", "sys_notice_version_id",
)
_RECORD_COLUMNS = ("code", *_CONTENT, "source_file_id")
_SEARCH_COLUMNS = ("record_code", "winner_position", "winners", "channel", "award_date", "award_year", "value_bani", "value_bucket", "badges", "procedure",
                   "cpv_code", "counted_bani", "ceiling_bani", "suspect", "share_bani", "authority_key", "authority_cui", "supplier_cui", "supplier_key",
                   "supplier_spelling", "supplier_vat", "supplier_curated", "supplier_differs", "doc")
_WITHHELD_COLUMNS = ("record_code", "winner_position", "name", "had_cnp")

# Staging: one batch of Records and their search and withheld rows is COPYed into these (session-local and never written to the WAL, like an unlogged table,
# and not part of any schema the graph holds), then three set-based statements apply it. `seq` is the order the rows came in.
_STAGING = (
    f"CREATE TEMP TABLE IF NOT EXISTS stage_record AS SELECT 0 AS seq, {', '.join(_RECORD_COLUMNS)} FROM seap.record WITH NO DATA",
    f"CREATE TEMP TABLE IF NOT EXISTS stage_search AS SELECT 0 AS seq, {', '.join(_SEARCH_COLUMNS)} FROM seap.search_load WITH NO DATA",
    f"CREATE TEMP TABLE IF NOT EXISTS stage_withheld AS SELECT 0 AS seq, {', '.join(_WITHHELD_COLUMNS)} FROM withheld.natural_person_name WITH NO DATA",
    "CREATE TEMP TABLE IF NOT EXISTS stage_applied (code text PRIMARY KEY, inserted boolean NOT NULL)",
)
# Precedence, in one statement for the whole batch (ADR 0002 and its amendment; the rule is the WHERE): a BULK row replaces a CRAWL row and a CRAWL row never
# replaces a BULK one; within the same `via`, a newer publication replaces, the same publication with different content replaces (a later file wins the tie),
# and the same content changes nothing. What it applied (a row that lost is not in the result) goes to stage_applied, `inserted` false for a replacement.
_APPLY = f"""
WITH applied AS (
    INSERT INTO seap.record ({", ".join(_RECORD_COLUMNS)})
    SELECT {", ".join(_RECORD_COLUMNS)} FROM stage_record ORDER BY seq
    ON CONFLICT (code) DO UPDATE SET {", ".join(f"{c} = EXCLUDED.{c}" for c in _CONTENT)}, source_file_id = EXCLUDED.source_file_id
    WHERE (EXCLUDED.via = 'BULK' AND seap.record.via = 'CRAWL')
       OR (EXCLUDED.via = seap.record.via AND (EXCLUDED.published_on > seap.record.published_on
       OR (EXCLUDED.published_on = seap.record.published_on
           AND ROW({", ".join(f"EXCLUDED.{c}" for c in _CONTENT)}) IS DISTINCT FROM ROW({", ".join(f"seap.record.{c}" for c in _CONTENT)}))))
    RETURNING code, (xmax = 0) AS inserted)
INSERT INTO stage_applied SELECT code, inserted FROM applied
"""
# A replaced version's search rows and withheld names go; then the applied Records' rows come in, in the order they arrived (so the ids follow it; the load table's, then seap.search's, #305).
_DROP_REPLACED = (
    "DELETE FROM seap.search_load WHERE record_code IN (SELECT code FROM stage_applied WHERE NOT inserted)",
    "DELETE FROM withheld.natural_person_name WHERE record_code IN (SELECT code FROM stage_applied WHERE NOT inserted)",
)
_WRITE_WITHHELD = f"""INSERT INTO withheld.natural_person_name ({", ".join(_WITHHELD_COLUMNS)})
    SELECT {", ".join(f"w.{c}" for c in _WITHHELD_COLUMNS)} FROM stage_withheld w JOIN stage_applied a ON a.code = w.record_code ORDER BY w.seq"""
_WRITE_SEARCH = f"""INSERT INTO seap.search_load ({", ".join(_SEARCH_COLUMNS)})
    SELECT {", ".join(f"s.{c}" for c in _SEARCH_COLUMNS)} FROM stage_search s JOIN stage_applied a ON a.code = s.record_code ORDER BY s.seq"""

_TRUNCATE_STAGING = "TRUNCATE stage_record, stage_search, stage_withheld, stage_applied"


def _copy(cur: psycopg.Cursor, table: str, columns: Sequence[str], rows: list[tuple]) -> None:
    with cur.copy(f"COPY {table} (seq, {', '.join(columns)}) FROM STDIN (FREEZE)") as copy:
        for seq, row in enumerate(rows):
            copy.write_row((seq, *row))


def _batches(rows: list[BulkRecord]) -> Iterator[list[BulkRecord]]:
    """The rows in order, cut so that no code is twice in a batch: a code that comes again in the same file meets the rule against the version before it, as if
    loaded one by one. (A bulk file keeps one version per identity, so this is one batch; a crawled day may repeat a code.)"""
    batch: list[BulkRecord] = []
    seen: set[str] = set()
    for r in rows:
        if r.code in seen:
            yield batch
            batch, seen = [], set()
        batch.append(r)
        seen.add(r.code)
    if batch:
        yield batch


def _winner_json(name: str | None, w: Resolved, share: int | None = None) -> dict:
    """What `seap.record.winners` keeps of a winner. A natural person keeps nothing: no name, no key, no id (but a share slot).
    `share` is the winner's equal share of the value in bani (a string, like every Bani); the key is there only for several winners."""
    if w.natural_person:
        out = {"name": None, "key": None, "identity": None, "naturalPerson": True, "curated": False, "differsFromAnaf": False, "cuiMismatch": w.cui_mismatch}
    else:
        out = {"name": name, "key": w.key, "identity": w.identity, "naturalPerson": False, "curated": w.curated,
               "differsFromAnaf": w.differs_from_anaf, "cuiMismatch": w.cui_mismatch}
    if share is not None:
        out["share"] = str(share)
    return out


def _identity_badges(winners: list[Resolved]) -> list[str]:
    badges = []
    if any(w.cui_mismatch for w in winners):
        badges.append("CUI_MISMATCH")
    if any(w.differs_from_anaf for w in winners):
        badges.append("NAME_DIFFERS_FROM_ANAF")
    if any(w.curated for w in winners):
        badges.append("IDENTITY_CURATED")
    return badges


def load_records(cur: psycopg.Cursor, source_file_id: int, rows: list[BulkRecord], resolver: Resolver | None = None,
                 estimates: dict[str, Estimate] | None = None) -> None:
    """Upsert Records by code. A code that is already there is replaced only by a later publication date, or by the same
    date with different content (the later file wins a tie), so a re-uploaded old file cannot overwrite newer data and the
    same content twice changes nothing. A replacement replaces the whole Record: its lots and winners are the newer
    version's, not a merge. A crawled Record (via CRAWL, #77) is always replaced by a bulk one and never replaces one.
    Authority and winners are resolved to entity keys here (`resolver`: ANAF's answers and the override file); without one
    nothing is confirmed, so every supplier is name-only. What each Record adds to a sum is decided here, once, by the counting
    rule (counting.py; `estimates` are the archived e-licitatie lookups): the API only sums what is stored."""
    resolver = resolver or Resolver()
    for stmt in _STAGING:
        cur.execute(stmt)
    for batch in _batches(rows):
        records, searches, withheld = [], [], []
        for r in batch:
            winners = r.all_winners
            contract = r.kind in ("CONTRACT", "AWARD_NOTICE")
            authority = resolve_authority(r.authority_cui, r.authority_name)
            resolved = [(w.name, resolver.supplier(w.name, w.cui, r.authority_cui)) for w in winners]
            first_name, first = resolved[0] if resolved else (None, None)
            counted = count(r.kind, r.value_bani, r.award_date, r.contract_type, r.cpv_code, r.concluded_by, r.notice_code, len(winners), estimates)
            badges = [*counted.badges, *_identity_badges([w for _, w in resolved])]  # on the Record and on each of its search rows
            params = dict(
                code=r.code, kind=r.kind, channel="CONTRACT" if contract else "DIRECT_PURCHASE", title=r.title, state=r.state,
                authority_cui=authority.cui, authority_key=authority.key, authority_name=r.authority_name,
                supplier_cui=first.cui if first and first.identity == "CUI" else None,
                supplier_name=first_name if first and not first.natural_person else None,
                cpv_code=r.cpv_code, cpv_description=r.cpv_description,
                contract_type=r.contract_type, published_on=r.published_on, quarter=r.quarter, award_date=r.award_date,
                estimated_bani=r.estimated_bani, value_bani=counted.value_bani, counted_bani=counted.counted_bani,
                ceiling_bani=counted.ceiling_bani, suspect=counted.suspect, framework_role=counted.framework_role, suspect_rule=counted.suspect_rule,
                suspect_threshold_bani=counted.suspect_threshold_bani,
                load_notes=list(dict.fromkeys((*r.notes, *counted.notes))),
                winners=json.dumps([_winner_json(n, w, counted.shares[i] if counted.shares else None) for i, (n, w) in enumerate(resolved)]),
                badges=badges,
                notice_code=r.notice_code, contract_numbers=list(r.contract_numbers), procedure=r.procedure,
                concluded_by=r.concluded_by, initiation_code=r.initiation_code, lot_count=r.lot_count, via=r.via, url=r.url,
                ca_notice_id=r.ca_notice_id, sys_notice_type_id=r.sys_notice_type_id, sys_notice_version_id=r.sys_notice_version_id,
                source_file_id=source_file_id,
            )
            records.append(tuple(params[c] for c in _RECORD_COLUMNS))
            for position, (name, w) in enumerate(resolved, start=1):  # natural persons: the name, withheld (never served, never a CNP)
                if w.natural_person and (kept := withheld_name(name)):
                    withheld.append((r.code, position, kept, w.had_cnp))
            doc = _search_doc(r, authority, resolved)
            # one row per winner; share_bani is the winner's equal share of the counted value (counting.split_evenly), a sole winner has it all
            for position, (name, w) in enumerate(resolved or [(None, None)], start=1):
                keyed = w is not None and not w.natural_person
                searches.append((r.code, position, max(len(winners), 1), "CONTRACT" if contract else "DIRECT_PURCHASE", r.award_date, r.award_date.year,
                                 counted.value_bani, value_bucket(counted.value_bani), badges, r.procedure, r.cpv_code, counted.counted_bani, counted.ceiling_bani,
                                 counted.suspect, counted.counted_shares[position - 1] if counted.counted_shares else None, authority.key, authority.cui,
                                 w.cui if keyed and w.identity == "CUI" else None, w.key if keyed else None, (name or None) if keyed else None,
                                 w.foreign_vat_id if keyed else None, bool(keyed and w.curated), bool(keyed and w.differs_from_anaf), doc))
        cur.execute(_TRUNCATE_STAGING)
        _copy(cur, "stage_record", _RECORD_COLUMNS, records)
        _copy(cur, "stage_search", _SEARCH_COLUMNS, searches)
        _copy(cur, "stage_withheld", _WITHHELD_COLUMNS, withheld)
        cur.execute(_APPLY)
        for stmt in _DROP_REPLACED:
            cur.execute(stmt)
        cur.execute(_WRITE_WITHHELD)
        cur.execute(_WRITE_SEARCH)
        cur.execute(_TRUNCATE_STAGING)  # a batch of staged rows is not kept until the top-level commit


@dataclass
class UnitOutcome:
    """What reading one unit came to. `files` is empty unless it loads."""

    index: int
    total: int
    unit: Unit
    status: str  # 'loaded' | 'skipped' | 'quarantined'
    files: list[tuple[str, list[BulkRecord]]] = field(default_factory=list)
    rows: int = 0  # data rows read from its files, duplicates included
    reason: str | None = None
    set_aside: dict[str, SetAside] = field(default_factory=dict)  # file name -> the tail set aside (a file that switches kind partway)
    duplicate_files: list[Path] = field(default_factory=list)  # this unit's files that are byte-identical to one already planned (also of a unit that is then quarantined)
    problems: list[str] = field(default_factory=list)  # a quarantined unit's problems: its reason file lists them


def iter_units(archive: Archive, summary: RebuildSummary, progress: Progress | None = None,
               loaded: set[tuple[str, str]] | None = None, recorded: Sequence = ()) -> Iterator[UnitOutcome]:
    """Read the archive one unit at a time: complete units only, each file validated; a failing unit is quarantined.

    Oldest fetch first, so a re-uploaded file (a later fetch of the same unit) is applied after the original. A file
    whose bytes were already planned is skipped. A file's (kind, sha) counts as planned only once its whole unit validates.
    `loaded` is the (kind, sha256) set of files the graph already holds (hand_offs.load_loaded_hashes); it grows as units validate.

    `recorded` (a resumed build, #293): the `build.unit` rows of the units already committed, units 1..N of the same ordering. Those are not read, hashed or
    yielded again; the others carry on from N+1 and the total counts both, so every index, `units_total` and the progress counters are an uninterrupted run's.
    A unit that was quarantined is gone from the listing (moved), which is why the total is the recorded units plus the ones still to read.

    A quarantined unit is yielded BEFORE it is moved: the consumer records it (and commits that row), and the move happens when the consumer asks for the
    next unit. A kill in between leaves a recorded quarantine whose directory is still in the archive: the resume finishes the move (Archive.complete_quarantine).
    """
    done = {r.path for r in recorded}
    summary.incomplete = archive.incomplete(skip=("onrc", "financials"), exclude=done)  # ONRC and the financial statements report their own (their files are too big to hash twice)
    units = [u for u in archive.units("seap", exclude=done) if u.source == "seap" and ((u.stream == "bulk" and u.kind in KINDS) or (u.stream == "crawl" and u.kind in (CRAWL_KIND, BACKFILL_KIND)))]
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    total = len(recorded) + len(units)
    summary.units_total = total
    if progress:
        progress.start(total, archive.root)
        if recorded:
            progress.restore_units(**unit_counts(list(recorded)))
    loaded = set() if loaded is None else loaded  # (kind, sha256) of files already planned
    for index, unit in enumerate(units, start=len(recorded) + 1):
        if progress:
            progress.begin(index, total, unit.kind, unit.unit)
        files: list[tuple[str, list[BulkRecord]]] = []
        keys = []  # recorded as loaded only once the whole unit validates
        rows = 0
        set_aside: dict[str, SetAside] = {}
        duplicates: list[Path] = []
        try:
            if unit.stream == "crawl":  # a crawled day: one parse of its list and contracts pages, Records by kind
                parsed_day = parse_crawl_unit(unit)
                files = [(label, records) for label, records in parsed_day.records.items() if records]
                rows = parsed_day.rows
            else:
                for name in unit.files:
                    path = unit.file_path(name)
                    key = (unit.kind, sha256_of(path))
                    if key in loaded or key in keys:  # the same bytes again (a re-fetch of an unchanged file): nothing to load
                        summary.duplicate_files.append(path)
                        duplicates.append(path)
                        continue
                    parsed = parse_file_stats(unit.kind, unit.unit, path)
                    files.append((name, parsed.records))
                    rows += parsed.rows
                    if parsed.set_aside:
                        set_aside[name] = parsed.set_aside
                    keys.append(key)
        except InvalidFile as e:
            problems = [p for p in e.problems if p]
            yield UnitOutcome(index, total, unit, "quarantined", rows=rows, reason=e.reason, duplicate_files=duplicates, problems=problems)  # recorded (and committed) first
            summary.quarantined.append(archive.quarantine(unit, e.reason, problems))
            continue  # all or nothing: none of this unit's files load
        loaded.update(keys)
        summary.set_aside += [(unit.file_path(name), aside) for name, aside in set_aside.items()]
        yield UnitOutcome(index, total, unit, "loaded" if files else "skipped", files, rows,
                          None if files else ("no Records" if unit.stream == "crawl" else "same file already loaded"), set_aside, duplicates)


@dataclass
class Plan:
    """What a rebuild will load: validated files in load order, plus what was set aside."""

    files: list[tuple[Unit, str, list[BulkRecord]]]
    summary: RebuildSummary


def plan(archive: Archive) -> Plan:
    """The whole archive read at once (tests, small archives); `rebuild` streams instead."""
    summary = RebuildSummary()
    files = [(o.unit, name, rows) for o in iter_units(archive, summary) for name, rows in o.files]
    return Plan(files, summary)


_UPSERT_COMPANY = """
INSERT INTO core.anaf_company (cui, name, status, registration, address, postal_code, seat, fiscal_domicile, fetched_at, archive_path)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (cui) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, registration = EXCLUDED.registration,
    address = EXCLUDED.address, postal_code = EXCLUDED.postal_code, seat = EXCLUDED.seat,
    fiscal_domicile = EXCLUDED.fiscal_domicile, fetched_at = EXCLUDED.fetched_at, archive_path = EXCLUDED.archive_path
"""


def load_anaf(cur: psycopg.Cursor, archive: Archive, summary: RebuildSummary) -> None:
    """The archived ANAF answers into `core.anaf_company`, oldest first so the latest answer per CUI wins (a later
    "not found" removes the company). Fills the summary's counts; the names the resolver asks are read back from the table (hand_offs.load_anaf_names)."""
    names: dict[str, str] = {}
    missing: set[str] = set()
    for company, not_found in iter_companies(archive):
        if company:
            cur.execute(_UPSERT_COMPANY, (company.cui, company.name, company.status, company.registration, company.address,
                                          company.postal_code, Jsonb(company.seat), Jsonb(company.fiscal_domicile),
                                          company.fetched_at, company.archive_path))
            names[company.cui] = compare_name(company.name)
            missing.discard(company.cui)
        elif not_found is not None:
            cur.execute("DELETE FROM core.anaf_company WHERE cui = %s", (str(not_found),))
            names.pop(str(not_found), None)
            missing.add(str(not_found))
    summary.anaf_found, summary.anaf_not_found = len(names), len(missing)


# Every (entity key, spelling, date, role) the loaded Records name: suppliers from the search rows (one per winner, a natural
# person has no key), authorities from the Records.
_PARTIES = """
CREATE TEMP TABLE party ON COMMIT DROP AS
SELECT s.supplier_key AS key, s.supplier_spelling AS name, s.award_date, s.record_code, s.supplier_vat AS vat,
       s.supplier_curated AS curated, s.supplier_differs AS differs, r.source_file_id
  FROM seap.search_load s JOIN seap.record r ON r.code = s.record_code WHERE s.supplier_key IS NOT NULL
UNION ALL
SELECT authority_key, authority_name, award_date, code, NULL, false, false, source_file_id
  FROM seap.record WHERE authority_key IS NOT NULL
"""
_ALIASES = """
INSERT INTO core.alias (entity_key, name, records, first_date, last_date, differs_from_anaf)
SELECT key, name, count(DISTINCT record_code), min(award_date), max(award_date), bool_or(differs)
  FROM party WHERE name IS NOT NULL AND name <> '' GROUP BY key, name
"""
# the entity's SEAP name is its most frequent spelling (a tie: the alphabetically first); ANAF's name replaces it when ANAF has the CUI
_ENTITIES = """
INSERT INTO core.entity (key, identity, cui, foreign_vat_id, display_name, anaf_status, identity_curated, provenance_source,
                         provenance_via, fetched_at)
SELECT k.key,
       CASE WHEN k.key ~ '^[0-9]+$' THEN 'CUI' ELSE 'NAME_ONLY' END,
       CASE WHEN k.key ~ '^[0-9]+$' THEN k.key END,
       k.vat,
       coalesce(a.name, nullif(o.name, ''), top.name, k.vat, k.key),
       a.status, k.curated,
       CASE WHEN a.cui IS NOT NULL THEN 'ANAF' WHEN o.cui IS NOT NULL THEN 'ONRC' ELSE 'SEAP' END,
       CASE WHEN a.cui IS NOT NULL THEN NULL WHEN o.cui IS NOT NULL THEN o.snapshot_date::text ELSE f.via END,
       coalesce(a.fetched_at, os.fetched_at, f.fetched_at)
  FROM (SELECT key, max(vat) AS vat, bool_or(curated) AS curated, max(source_file_id) AS file_id FROM party GROUP BY key) k
  LEFT JOIN core.anaf_company a ON a.cui = k.key
  LEFT JOIN onrc.registration o ON o.cui = k.key AND o.primary_for_cui AND a.cui IS NULL  -- ONRC names a CUI ANAF does not know (ADR 0018)
  LEFT JOIN onrc.snapshot os ON os.snapshot_date = o.snapshot_date
  LEFT JOIN LATERAL (SELECT name FROM spelling WHERE entity_key = k.key ORDER BY records DESC, name LIMIT 1) top ON true
  JOIN seap.source_file f ON f.id = k.file_id
"""


def _fold_names(cur: psycopg.Cursor, chunk: int = 50_000) -> None:
    """`core.entity.name_folded` (the Go-to lookup of a name query, #69) from the final display names, folded as every query is."""
    # a server-side cursor: ONRC makes core.entity millions of rows, never all of them in Python at once (the cursor sees the table as it was opened)
    with cur.connection.cursor(name="fold_names") as names:
        names.itersize = chunk
        names.execute("SELECT key, display_name FROM core.entity")
        while part := names.fetchmany(chunk):
            cur.execute("UPDATE core.entity e SET name_folded = v.f FROM unnest(%s::text[], %s::text[]) AS v(k, f) WHERE e.key = v.k",
                        ([k for k, _ in part], [fold(n) for _, n in part]))
    cur.execute("CREATE INDEX entity_name_folded ON core.entity (name_folded) WHERE name_folded <> ''")


def build_entities(cur: psycopg.Cursor, overrides: Overrides, summary: RebuildSummary) -> None:
    """`core.entity` and `core.alias` from the loaded Records (ADR 0003). The CUI an ANAF-confirmed supplier is keyed on is
    the same string as `core.anaf_company.cui`, so ANAF's name and status attach by key. ANAF's name goes through the
    comma-below fix; the raw name stays in `core.anaf_company`."""
    cur.execute(_PARTIES)
    analyze(cur, "party")  # a temp table: autovacuum never reaches it
    cur.execute("CREATE TEMP TABLE spelling ON COMMIT DROP AS SELECT key AS entity_key, name, count(DISTINCT record_code) AS records "
                "FROM party WHERE name IS NOT NULL AND name <> '' GROUP BY key, name")
    analyze(cur, "spelling")
    cur.execute(_ENTITIES)  # entities first: core.alias references them
    cur.execute(_ALIASES)
    if summary.onrc is not None:  # every registration no Record names becomes an entity too (ADR 0018); an override-pinned CUI keeps the override's entity
        summary.onrc.entities_only = build_onrc_entities(cur, list(overrides.by_id))
    cur.execute("UPDATE core.entity SET display_name = translate(display_name, 'ŞşŢţ', 'ȘșȚț') WHERE provenance_source IN ('ANAF', 'ONRC')")
    for override in (*overrides.by_id.values(), *overrides.by_name.values()):
        if override.display_name:
            cur.execute("UPDATE core.entity SET display_name = %s WHERE key = %s", (override.display_name, override.key))
    _fold_names(cur)
    analyze(cur, "core.entity", "core.alias")  # placement, aep, amepip and donations join it
    cur.execute("SELECT count(*) FROM core.entity")
    summary.entities = cur.fetchone()[0]


# One row per award notice with a framework or a subsequent Record. A subsequent contract is linked to its framework by the award
# notice number: in the real Contracte files the subsequent contracts of a framework agreement are published under the same
# award notice (`Numar anunt atribuire`) as the agreement's own contract(s) (checked on 2022 T1, 2023 T1 and 2025 T2: every
# subsequent contract's notice also holds at least one "Cu acord cadru" contract). A notice can hold several framework
# contracts (one per supplier or lot): the agreement is the notice, its ceiling the sum of their ceilings, and the Record
# shown as "the agreement" the lowest code. A subsequent contract whose notice has no framework Record loaded (the agreement
# predates the archive, or a quarter is missing) still counts; its link has no agreement and no ceiling.
_FRAMEWORKS = """
INSERT INTO seap.framework (notice_code, agreement_code, ceiling_bani, subsequent_bani, subsequent_count, ratio)
SELECT notice_code,
       min(code) FILTER (WHERE framework_role = 'CEILING'),
       sum(ceiling_bani),
       coalesce(sum(counted_bani) FILTER (WHERE framework_role = 'SUBSEQUENT'), 0),
       count(*) FILTER (WHERE framework_role = 'SUBSEQUENT'),
       coalesce(sum(counted_bani) FILTER (WHERE framework_role = 'SUBSEQUENT'), 0)::float8
         / nullif(sum(ceiling_bani), 0)
  FROM seap.record WHERE framework_role IS NOT NULL AND notice_code IS NOT NULL GROUP BY notice_code
"""


def build_frameworks(cur: psycopg.Cursor) -> None:
    """The framework agreements and what their subsequent contracts reported (the counting rule's link, see `_FRAMEWORKS`)."""
    cur.execute(_FRAMEWORKS)


def rebuild(archive: Archive, db_url: str, progress: Progress | None = None, overrides_path: Path | str | None = None,
            placement_dir: Path | str | None = None, geo_dir: Path | str | None = None,
            today: date | None = None, known_gaps_path: Path | str | None = None,
            gate: Callable[[], None] | None = None, staged: bool = False, verdict: Verdict | None = None) -> RebuildSummary:
    """`staged` commits after every Step and every Raw archive unit (a build into the next database beside the live graph, switchover.py, which nothing reads until it is swapped in);
    the default is one transaction for the whole build (`--in-place`), which rolls back as one; `--in-place --staged` is `staged` against the database itself. `gate` runs once the load has committed, before the status file says finished and the outlines are written: a rebuild beside the
    live database (switchover.py) refuses a bad graph there, so a refused graph is never reported as finished. `today` (default: the UTC day) ends the Coverage grid's last quarter; `known_gaps_path` overrides the checked-in known-gaps file.

    `verdict` (resume.py) is the decision made before the next database was touched (switchover.build_and_switch): a resume continues the Steps that
    are committed there, with the pinned inputs it holds; fresh builds from the start with the verdict's pins. Without one (a direct call, plain `--in-place`)
    the build is fresh, pinned now, and this function prints the verdict line itself: it is always the first line of a run. Every read of the Raw
    archive goes through a view pinned to the verdict's units, so a unit that lands during the build waits for the next one."""
    from .build_steps import STEPS, BuildContext, run_steps  # here, not at the top: build_steps imports this module's helpers

    summary = RebuildSummary()
    if verdict is None:
        pins = compute_pins(archive, today or datetime.now(timezone.utc).date(),
                            pin_extra(overrides_path, placement_dir, known_gaps_path))
        verdict = decide(pins, None, STEPS, staged=staged, direct=True)
        if progress:
            progress.note(verdict.line)
    today = verdict.pins.today
    pinned = archive.pinned(verdict.pins.units, set(verdict.pins.quarantined))  # the quarantine listing of the pins too: a unit requeued since the pin is still flagged, as in an uninterrupted build
    summary.pinned_view = pinned
    if progress and staged:
        progress.mark_staged()
        progress.mark_database(conninfo_to_dict(db_url).get("dbname", ""))  # the name only: the URL carries the password

    def step(name: str):  # a timed `rebuild step NAME` start/done pair in the log (progress.py); nothing without a Progress
        return progress.step(name) if progress else nullcontext()

    try:
        with psycopg.connect(db_url, autocommit=staged, options=f"-c maintenance_work_mem={MAINTENANCE_WORK_MEM}") as conn, conn.cursor() as cur:  # staged: autocommit, so every Step's `conn.transaction()` is a real BEGIN/COMMIT whatever ran between Steps; in place: the one outer transaction of run_steps
            ctx = BuildContext(pinned, cur, conn, summary, today, progress, staged, placement_dir, known_gaps_path,
                               overrides=Overrides.load(overrides_path or DEFAULT_OVERRIDES),
                               person_overrides=PersonOverrides.load(overrides_path or DEFAULT_OVERRIDES),  # `[[person_split]]` / `[[person_merge]]` of the same file (#177)
                               pins=verdict.pins)
            if verdict.resume and verdict.changed_files:  # resumed after a code change confined to Steps not yet run: the ledger now says which code the rest runs with
                record_code_change(cur, verdict.pins, verdict.changed_files)
            with staged_build() if staged else nullcontext():  # the Steps' commit boundaries are where a stop request pauses (stop.py)
                run_steps(ctx, resume=verdict.resume)  # build_steps.STEPS: one transaction, or one per Step when staged; the last Step commits (a resume skips the committed ones)
            data_through = load_data_through(cur)  # from core.data_through, which the signals Step filled
        STOP.build_finished()  # the load is complete: a stop request that came after the last boundary is noted, a leftover stop file removed (stop.py)
    except BuildPaused as e:  # stopped on request at a committed boundary: not a failure, the next run resumes it
        if progress:
            progress.pause(e.reached, e.reason)
        raise
    except BaseException as e:  # incl. KeyboardInterrupt / SystemExit: the open transaction rolls back (all of it in place; the running Step when staged), the old schema stays
        if progress:
            if staged and isinstance(e, SystemExit):  # the second SIGTERM of a staged build: its committed Steps stay, so it is resumable, not failed
                progress.interrupt(e)
            else:
                progress.fail(e)
        raise
    if gate:
        try:
            with step("check"):  # the switchover's check of the new graph against the live one (switchover.py)
                gate()
        except BaseException as e:  # refused: recorded as failed, nothing served, no outlines
            if progress:
                progress.fail(e)
            raise
    if progress:  # the load is committed (VACUUM is not graph work, so an interrupt there is not a failed load): `pipeline status` must not show a running rebuild while the (slower) national outlines are dissolved
        progress.finish(summary.records, data_through)
    try:
        with step("vacuum"):
            vacuum(db_url)  # cannot run inside the transaction above: right after the commit
            vacuum_onrc_search(db_url)
    except Exception as e:  # the rebuild has committed: search stays correct without the VACUUM, only slower
        log.warning("VACUUM ANALYZE of seap.search or onrc.search failed after the commit (search is correct, but slower until it runs): %s", e)
    # the county and UAT outlines are static files, not graph: built after the commit (a failure here never undoes the load)
    from .geo.topo import build_topojson

    try:
        with step("outlines"):
            summary.geo_line = build_topojson(archive, Path(geo_dir) if geo_dir else archive.root / "derived" / "geo", placement_dir).line()
    except Exception as e:  # the graph is loaded; the outlines can be rebuilt on their own with `pipeline geo-topojson`
        summary.geo_line = f"geo: TopoJSON failed ({type(e).__name__}: {e}); the graph is loaded, rerun `pipeline geo-topojson`"
    return summary
