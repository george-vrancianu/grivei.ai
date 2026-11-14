"""`pipeline rebuild`: derive the graph from the raw archive into a fresh `seap` schema (ADR 0004).

Reads only units with a complete manifest, oldest fetch first, and loads each unit all or nothing (SEAP bulk files of
every registered kind: DA, DAN, contracte, fara-anunt). A unit that fails validation is moved to the quarantine area with
a reason file and loads nothing. The whole rebuild is one transaction, so a failed or killed rebuild leaves the previous
schema in place and nothing half-loaded: rerun it from scratch. The same archive always gives the same database.

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

import logging
from contextlib import nullcontext
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, Iterator

import psycopg
from psycopg.types.json import Jsonb

from .anaf import iter_companies
from .archive import Archive, Unit, sha256_of
from .bulk import KINDS, BulkRecord, InvalidFile, SetAside, parse_file_stats
from .counting import Estimate, count
from .coverage import build_coverage, flagged as flagged_cells
from .coverage import parse_quarter as _parse_quarter
from .crawl import KIND as CRAWL_KIND
from .crawl.unitdir import BACKFILL_KIND, CRAWLED_KINDS, contiguous_through as crawl_through
from .crawl.records import parse_unit as parse_crawl_unit
from .estimates import read_estimates
from .fold import fold
from .identity import DEFAULT_OVERRIDES, Overrides, Resolved, Resolver, compare_name, resolve_authority, withheld_name
from .mf.build import MfSummary, build_mf
from .onrc.build import OnrcNames, OnrcSummary, build_onrc, build_onrc_entities, build_onrc_placement
from .amepip.build import AmepipSummary, build_amepip
from .financials.build import FinancialsSummary, build_financials
from .placement.build import PlacementSummary, build_placement
from .progress import Progress
from .rollup import build_rollup
from .signals import build_signals
from .sources import SEAP, SOURCES
from .search import create_index, value_bucket, vacuum

log = logging.getLogger("pipeline.rebuild")

SQL_DIR = Path(__file__).parent / "sql"
CORE_SQL = SQL_DIR / "core_schema.sql"
WITHHELD_SQL = SQL_DIR / "withheld_schema.sql"
AMEPIP_SQL = SQL_DIR / "amepip_schema.sql"
FINANCIALS_SQL = SQL_DIR / "financials_schema.sql"


@dataclass
class RebuildSummary:
    files_loaded: int = 0
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
    amepip: AmepipSummary | None = None  # the AMEPIP public-enterprise list step (#183)
    financials: FinancialsSummary | None = None  # the MF annual financial statements step (#179)
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
        if self.amepip is not None:
            out.append(self.amepip.line())
        if self.financials is not None:
            out.append(self.financials.line())
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
_UPSERT = f"""
INSERT INTO seap.record (code, {", ".join(_CONTENT)}, source_file_id)
VALUES (%(code)s, {", ".join(f"%({c})s" for c in _CONTENT)}, %(source_file_id)s)
ON CONFLICT (code) DO UPDATE SET {", ".join(f"{c} = EXCLUDED.{c}" for c in _CONTENT)}, source_file_id = EXCLUDED.source_file_id
WHERE (EXCLUDED.via = 'BULK' AND seap.record.via = 'CRAWL')
   OR (EXCLUDED.via = seap.record.via AND (EXCLUDED.published_on > seap.record.published_on
   OR (EXCLUDED.published_on = seap.record.published_on
       AND ROW({", ".join(f"EXCLUDED.{c}" for c in _CONTENT)}) IS DISTINCT FROM ROW({", ".join(f"seap.record.{c}" for c in _CONTENT)}))))
RETURNING (xmax = 0) AS inserted
"""


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
    for r in rows:
        winners = r.all_winners
        contract = r.kind in ("CONTRACT", "AWARD_NOTICE")
        authority = resolve_authority(r.authority_cui, r.authority_name)
        resolved = [(w.name, resolver.supplier(w.name, w.cui, r.authority_cui)) for w in winners]
        first_name, first = resolved[0] if resolved else (None, None)
        counted = count(r.kind, r.value_bani, r.award_date, r.contract_type, r.cpv_code, r.concluded_by, r.notice_code, len(winners), estimates)
        badges = [*counted.badges, *_identity_badges([w for _, w in resolved])]  # on the Record and on each of its search rows
        cur.execute(
            _UPSERT,
            dict(
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
                winners=Jsonb([_winner_json(n, w, counted.shares[i] if counted.shares else None) for i, (n, w) in enumerate(resolved)]),
                badges=badges,
                notice_code=r.notice_code, contract_numbers=list(r.contract_numbers), procedure=r.procedure,
                concluded_by=r.concluded_by, initiation_code=r.initiation_code, lot_count=r.lot_count, via=r.via, url=r.url,
                ca_notice_id=r.ca_notice_id, sys_notice_type_id=r.sys_notice_type_id, sys_notice_version_id=r.sys_notice_version_id,
                source_file_id=source_file_id,
            ),
        )
        replaced = cur.fetchone()
        if replaced is None:  # unchanged, or older than what is stored
            continue
        if not replaced[0]:  # a version that replaces another: its search rows and withheld names go
            cur.execute("DELETE FROM seap.search WHERE record_code = %s", (r.code,))
            cur.execute("DELETE FROM withheld.natural_person_name WHERE record_code = %s", (r.code,))
        for position, (name, w) in enumerate(resolved, start=1):  # natural persons: the name, withheld (never served, never a CNP)
            if w.natural_person and (kept := withheld_name(name)):
                cur.execute("INSERT INTO withheld.natural_person_name (record_code, winner_position, name, had_cnp) VALUES (%s, %s, %s, %s)",
                            (r.code, position, kept, w.had_cnp))
        doc = _search_doc(r, authority, resolved)
        # one row per winner; share_bani is the winner's equal share of the counted value (counting.split_evenly), a sole winner has it all
        for position, (name, w) in enumerate(resolved or [(None, None)], start=1):
            keyed = w is not None and not w.natural_person
            cur.execute(
                """INSERT INTO seap.search (record_code, winner_position, winners, channel, award_date, award_year, value_bani, value_bucket,
                       badges, procedure, cpv_code, counted_bani, ceiling_bani, suspect, share_bani, authority_key, authority_cui, supplier_cui,
                       supplier_key, supplier_spelling, supplier_vat, supplier_curated, supplier_differs, doc)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (r.code, position, max(len(winners), 1), "CONTRACT" if contract else "DIRECT_PURCHASE", r.award_date, r.award_date.year,
                 counted.value_bani, value_bucket(counted.value_bani), badges, r.procedure, r.cpv_code, counted.counted_bani, counted.ceiling_bani,
                 counted.suspect, counted.counted_shares[position - 1] if counted.counted_shares else None, authority.key, authority.cui,
                 w.cui if keyed and w.identity == "CUI" else None, w.key if keyed else None, (name or None) if keyed else None,
                 w.foreign_vat_id if keyed else None, bool(keyed and w.curated), bool(keyed and w.differs_from_anaf), doc),
            )


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


def iter_units(archive: Archive, summary: RebuildSummary, progress: Progress | None = None) -> Iterator[UnitOutcome]:
    """Read the archive one unit at a time: complete units only, each file validated; a failing unit is quarantined.

    Oldest fetch first, so a re-uploaded file (a later fetch of the same unit) is applied after the original. A file
    whose bytes were already planned is skipped. A file's (kind, sha) counts as planned only once its whole unit validates.
    """
    summary.incomplete = archive.incomplete(skip=("onrc", "financials"))  # ONRC and the financial statements report their own (their files are too big to hash twice)
    units = [u for u in archive.units("seap") if u.source == "seap" and ((u.stream == "bulk" and u.kind in KINDS) or (u.stream == "crawl" and u.kind in (CRAWL_KIND, BACKFILL_KIND)))]
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    if progress:
        progress.start(len(units), archive.root)
    loaded: set[tuple[str, str]] = set()  # (kind, sha256) of files already planned
    for index, unit in enumerate(units, start=1):
        if progress:
            progress.begin(index, len(units), unit.kind, unit.unit)
        files: list[tuple[str, list[BulkRecord]]] = []
        keys = []  # recorded as loaded only once the whole unit validates
        rows = 0
        set_aside: dict[str, SetAside] = {}
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
                        continue
                    parsed = parse_file_stats(unit.kind, unit.unit, path)
                    files.append((name, parsed.records))
                    rows += parsed.rows
                    if parsed.set_aside:
                        set_aside[name] = parsed.set_aside
                    keys.append(key)
        except InvalidFile as e:
            summary.quarantined.append(archive.quarantine(unit, e.reason, [p for p in e.problems if p]))
            yield UnitOutcome(index, len(units), unit, "quarantined", rows=rows, reason=e.reason)
            continue  # all or nothing: none of this unit's files load
        loaded.update(keys)
        summary.set_aside += [(unit.file_path(name), aside) for name, aside in set_aside.items()]
        yield UnitOutcome(index, len(units), unit, "loaded" if files else "skipped", files, rows,
                          None if files else ("no Records" if unit.stream == "crawl" else "same file already loaded"), set_aside)


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


def load_anaf(cur: psycopg.Cursor, archive: Archive, summary: RebuildSummary) -> dict[str, str]:
    """The archived ANAF answers into `core.anaf_company`, oldest first so the latest answer per CUI wins (a later
    "not found" removes the company). Returns the CUIs ANAF confirms, each with its `compare_name`, for the resolver."""
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
    return names


# Every (entity key, spelling, date, role) the loaded Records name: suppliers from the search rows (one per winner, a natural
# person has no key), authorities from the Records.
_PARTIES = """
CREATE TEMP TABLE party ON COMMIT DROP AS
SELECT s.supplier_key AS key, s.supplier_spelling AS name, s.award_date, s.record_code, s.supplier_vat AS vat,
       s.supplier_curated AS curated, s.supplier_differs AS differs, r.source_file_id
  FROM seap.search s JOIN seap.record r ON r.code = s.record_code WHERE s.supplier_key IS NOT NULL
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
    cur.execute("CREATE TEMP TABLE spelling ON COMMIT DROP AS SELECT key AS entity_key, name, count(DISTINCT record_code) AS records "
                "FROM party WHERE name IS NOT NULL AND name <> '' GROUP BY key, name")
    cur.execute(_ENTITIES)  # entities first: core.alias references them
    cur.execute(_ALIASES)
    if summary.onrc is not None:  # every registration no Record names becomes an entity too (ADR 0018); an override-pinned CUI keeps the override's entity
        summary.onrc.entities_only = build_onrc_entities(cur, list(overrides.by_id))
    cur.execute("UPDATE core.entity SET display_name = translate(display_name, 'ŞşŢţ', 'ȘșȚț') WHERE provenance_source IN ('ANAF', 'ONRC')")
    for override in (*overrides.by_id.values(), *overrides.by_name.values()):
        if override.display_name:
            cur.execute("UPDATE core.entity SET display_name = %s WHERE key = %s", (override.display_name, override.key))
    _fold_names(cur)
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
            gate: Callable[[], None] | None = None) -> RebuildSummary:
    """`gate` runs once the load has committed, before the status file says finished and the outlines are written: a rebuild beside the
    live database (switchover.py) refuses a bad graph there, so a refused graph is never reported as finished. `today` (default: the UTC day) ends the Coverage grid's last quarter; `known_gaps_path` overrides the checked-in known-gaps file."""
    summary = RebuildSummary()
    number = 0
    today = today or datetime.now(timezone.utc).date()
    bulk_rows: dict[tuple[str, tuple[int, int]], int] = {}  # (kind, quarter) -> data rows of the largest loaded bulk unit: the possibly-incomplete rule's count
    overrides = Overrides.load(overrides_path or DEFAULT_OVERRIDES)

    def step(name: str):  # a timed `rebuild step NAME` start/done pair in the log (progress.py); nothing without a Progress
        return progress.step(name) if progress else nullcontext()

    try:
        with psycopg.connect(db_url) as conn, conn.cursor() as cur:
            with step("schema"):
                cur.execute(CORE_SQL.read_text(encoding="utf-8"))
                for source in SOURCES:  # each Source's own schema (sql/<schema>_schema.sql), in registry order
                    cur.execute((SQL_DIR / f"{source.schema}_schema.sql").read_text(encoding="utf-8"))
                store_sources(cur)
                cur.execute(WITHHELD_SQL.read_text(encoding="utf-8"))  # after `seap`: its rows hang off seap.record
                cur.execute(AMEPIP_SQL.read_text(encoding="utf-8"))  # a Reference source's own tables (#183): not in the registry
                cur.execute(FINANCIALS_SQL.read_text(encoding="utf-8"))  # MF's annual financial statements (#179): a Reference source too
            with step("anaf-identities"):
                anaf_names = load_anaf(cur, archive, summary)
            with step("onrc"):
                summary.onrc = build_onrc(cur, archive, placement_dir)  # #175: the held snapshots -> the `onrc` schema; before the Records, so ONRC can confirm a CUI (ADR 0018)
                resolver = Resolver(OnrcNames(conn.cursor(), anaf_names), overrides)
            with step("estimates"):
                estimates = read_estimates(archive)  # the archived e-licitatie lookups for the counting rule; the rebuild never asks the network
                summary.estimates = len(estimates)
            for o in iter_units(archive, summary, progress):
                if o.status == "loaded" and o.unit.stream == "bulk":
                    cell = (KINDS[o.unit.kind].label, _parse_quarter(o.unit.unit))
                    bulk_rows[cell] = max(bulk_rows.get(cell, 0), o.rows)
                for name, rows in o.files:
                    number += 1
                    crawled = o.unit.stream == "crawl"  # one source_file per Record kind of a crawled day: `name` is the kind
                    cur.execute(
                        "INSERT INTO seap.source_file (id, kind, unit, file_name, sha256, via, url, fetched_at, row_count, stream, load_notes) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (number, name if crawled else KINDS[o.unit.kind].label, o.unit.unit, o.unit.unit if crawled else name,
                         sha256_of(o.unit.path / "manifest.json" if crawled else o.unit.file_path(name)),
                         None if crawled else o.unit.via, None if crawled else o.unit.url, o.unit.fetched_at, len(rows), "backfill" if o.unit.kind == BACKFILL_KIND else o.unit.stream,
                         [aside.note()] if (aside := o.set_aside.get(name)) else []),
                    )
                    load_records(cur, number, rows, resolver, estimates)
                    summary.files_loaded += 1
                if progress:
                    progress.unit_done(o.index, o.total, o.unit.kind, o.unit.unit, len(o.unit.files), o.rows,
                                       sum(len(rows) for _, rows in o.files), o.status, o.reason)
            with step("crawl-status"):
                # crawled survivors: provisional until the bulk has reached their quarter, crawl-only once it has (and they have no match);
                # a backfilled Record (#78) is crawl-only from the start: the bulk does not hold its kind for 2021-22, and for 2023+ it was chosen for missing from it
                cur.execute(
                    """UPDATE seap.record r SET crawl_status = CASE WHEN EXISTS (
                           SELECT 1 FROM seap.source_file f WHERE f.stream = 'bulk' AND f.kind = r.kind AND f.unit = r.quarter)
                       OR (SELECT f.stream FROM seap.source_file f WHERE f.id = r.source_file_id) = 'backfill'
                       THEN 'CRAWL_ONLY' ELSE 'PROVISIONAL' END WHERE r.via = 'CRAWL'""")
                for kind, bulk_kind in CRAWLED_KINDS.items():  # per kind: the bulk covers its quarters, the crawl the days after them with no hole
                    through = crawl_through(archive, CRAWL_KIND, bulk_kind)  # derived from the archive, so a rebuild reproduces it
                    if through:
                        cur.execute("INSERT INTO seap.crawl_state (stream, kind, through) VALUES (%s, %s, %s)", (CRAWL_KIND, kind, through))
            with step("crawl-badges"):
                # the crawl badges live beside the counting and identity ones on the search rows (the chips filter on them)
                cur.execute(
                    """UPDATE seap.search s SET badges = s.badges || CASE r.crawl_status WHEN 'PROVISIONAL' THEN 'CRAWLED_PROVISIONAL' ELSE 'CRAWL_ONLY' END
                         FROM seap.record r WHERE r.code = s.record_code AND r.crawl_status IS NOT NULL""")
            with step("frameworks"):
                build_frameworks(cur)
                cur.execute("SELECT count(DISTINCT notice_code) FROM seap.record WHERE load_notes @> ARRAY['estimate:not_fetched']")
                summary.estimates_missing = cur.fetchone()[0]
            with step("entities"):
                build_entities(cur, overrides, summary)
            with step("placement"):
                summary.placement = build_placement(cur, archive, placement_dir, after_insert=build_onrc_placement)  # #67: county, UAT, village, national, from the archive and the checked-in tables
            with step("mf"):
                summary.mf = build_mf(cur, archive, placement_dir, summary.placement.observations, summary.placement.entries)  # #80: the Ministry of Finance list, the Coverage denominator
            with step("amepip"):
                summary.amepip = build_amepip(cur, archive)  # #183: AMEPIP's public enterprises, flagged by CUI on the entities
            with step("financials"):
                summary.financials = build_financials(cur, archive)  # #179: MF's annual statements, one row per CUI per fiscal year; read beside the awards, never added to them
            with step("coverage"):
                cells = build_coverage(cur, archive, today, bulk_rows, known_gaps_path)
                summary.coverage = flagged_cells(cells)
                gaps = {(c.kind, c.quarter) for c in cells if c.state == "KNOWN_GAP"}
                summary.set_aside_without_gap = [path for path, _ in summary.set_aside
                                                 if (KINDS[path.parts[-4]].label, _quarter_label(path.parts[-3])) not in gaps]
            with step("signals"):
                cur.execute("SELECT count(*) FROM seap.record")
                summary.records = cur.fetchone()[0]
                through: dict[str, dict[str, str]] = {}  # per Source, per Record kind (the Source's own query, sources.py)
                for source in SOURCES:
                    cur.execute(source.data_through_sql)
                    through[source.id] = dict(cur.fetchall())
                data_through = through[SEAP.id]  # the signals and the status file are SEAP's today
                summary.signals = build_signals(cur, data_through)  # #74: before the rollup and the index, so has-Signals, the rollup and the scan agree
            with step("record-indexes"):
                # the entity(key) roles look a record up by authority and a search row by supplier: index after the load, not during it
                cur.execute("CREATE INDEX record_authority_key_idx ON seap.record (authority_key)")
                cur.execute("CREATE INDEX search_supplier_key_idx ON seap.search (supplier_key)")
                cur.execute("CREATE INDEX record_notice_code_idx ON seap.record (notice_code) WHERE framework_role IS NOT NULL")
                cur.execute("ANALYZE seap.record")
            with step("rollup"):
                build_rollup(cur)  # the empty and chips-only states read this; it carries the load generation the API's cache checks
            with step("search-index"):
                create_index(cur)  # the pg_search index is part of this transaction: search sees the load only once it commits
            with step("analyze-search"):
                cur.execute("ANALYZE seap.search")
            with step("commit"):
                conn.commit()  # what leaving the `with` would do; explicit so the commit is timed
    except BaseException as e:  # incl. KeyboardInterrupt / SystemExit: the transaction rolls back, the old schema stays
        if progress:
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
    except Exception as e:  # the rebuild has committed: search stays correct without the VACUUM, only slower
        log.warning("VACUUM ANALYZE of seap.search failed after the commit (search is correct, but slower until it runs): %s", e)
    # the county and UAT outlines are static files, not graph: built after the commit (a failure here never undoes the load)
    from .geo.topo import build_topojson

    try:
        with step("outlines"):
            summary.geo_line = build_topojson(archive, Path(geo_dir) if geo_dir else archive.root / "derived" / "geo", placement_dir).line()
    except Exception as e:  # the graph is loaded; the outlines can be rebuilt on their own with `pipeline geo-topojson`
        summary.geo_line = f"geo: TopoJSON failed ({type(e).__name__}: {e}); the graph is loaded, rerun `pipeline geo-topojson`"
    return summary
