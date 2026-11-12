"""`pipeline rebuild`: derive the graph from the raw archive into a fresh `seap` schema (ADR 0004).

Reads only units with a complete manifest, oldest fetch first, and loads each unit all or nothing (SEAP bulk files of
every registered kind: DA, DAN, contracte, fara-anunt). A unit that fails validation is moved to the quarantine area with
a reason file and loads nothing. The whole rebuild is one transaction, so a failed or killed rebuild leaves the previous
schema in place and nothing half-loaded: rerun it from scratch. The same archive always gives the same database.

Units are read and loaded one at a time, so memory holds one quarter's rows, not the archive's. Each unit reports to a
`Progress` (log line and status file, see progress.py).

A re-uploaded file loads like any file and per-identity precedence decides (ADR 0002, 2026-11-11 amendment): the later
notice publication wins, an older re-upload cannot overwrite newer data, and a quarter is never replaced wholesale, so
records absent from a re-upload are kept.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

import psycopg
from psycopg.types.json import Jsonb

from .archive import Archive, Unit, sha256_of
from .bulk import KINDS, BulkRecord, InvalidFile, parse_file_stats
from .crawl import KIND as CRAWL_KIND
from .crawl.unitdir import contiguous_through as crawl_through
from .crawl.records import parse_unit as parse_crawl_unit
from .progress import Progress

SCHEMA_SQL = Path(__file__).parent / "sql" / "seap_schema.sql"


@dataclass
class RebuildSummary:
    files_loaded: int = 0
    records: int = 0
    duplicate_files: list[Path] = field(default_factory=list)  # byte-identical to a file already planned: nothing to load
    quarantined: list[Path] = field(default_factory=list)
    incomplete: list[Path] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"loaded {self.records} records from {self.files_loaded} file(s)"]
        out += [f"skipped, same file already loaded: {p}" for p in self.duplicate_files]
        out += [f"quarantined: {p}" for p in self.quarantined]
        out += [f"skipped, incomplete (no valid manifest): {p}" for p in self.incomplete]
        return out


def fold(text: str) -> str:
    """The tracer's text folding: strip diacritics, lower-case, collapse spaces. (The search ticket owns the full rule.)"""
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped.lower()).strip()


# The data-through date per Record kind, the one definition `sources` (API) and `pipeline status` share: the latest publication date
# of the bulk Records, and for the crawled kinds the end of the unbroken run of complete crawl days (crawled Records' own dates do not count:
# one past a hole would hide the hole; a crawled day with nothing new still means "looked through that day").
DATA_THROUGH_SQL = """
SELECT kind, max(d)::text FROM (
    SELECT kind, max(published_on) AS d FROM seap.record WHERE via IS DISTINCT FROM 'CRAWL' GROUP BY kind
    UNION ALL
    SELECT k.kind, s.through FROM seap.crawl_state s CROSS JOIN (VALUES ('CONTRACT'), ('AWARD_NOTICE')) AS k(kind)
) x GROUP BY kind ORDER BY kind"""


def _search_doc(r: BulkRecord) -> str:
    parts = [r.title, r.authority_name, r.supplier_name, r.cpv_code, r.cpv_description, r.code, r.authority_cui, r.supplier_cui]
    for w in r.all_winners[1:]:  # the first winner is the supplier above
        parts += [w.name, w.cui]
    return fold(" ".join(p for p in parts if p))


# The columns whose change means "different content". Not source_file_id: the same Record from a re-uploaded copy is no change.
_CONTENT = (
    "kind", "channel", "title", "state", "authority_cui", "authority_name", "supplier_cui", "supplier_name", "cpv_code",
    "cpv_description", "contract_type", "published_on", "quarter", "award_date", "estimated_bani", "value_bani",
    "counted_bani", "load_notes", "winners", "notice_code", "contract_numbers", "procedure", "concluded_by",
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


def load_records(cur: psycopg.Cursor, source_file_id: int, rows: list[BulkRecord]) -> None:
    """Upsert Records by code. A code that is already there is replaced only by a later publication date, or by the same
    date with different content (the later file wins a tie), so a re-uploaded old file cannot overwrite newer data and the
    same content twice changes nothing. A replacement replaces the whole Record: its lots and winners are the newer
    version's, not a merge. A crawled Record (via CRAWL, #77) is always replaced by a bulk one and never replaces one."""
    for r in rows:
        winners = r.all_winners
        contract = r.kind in ("CONTRACT", "AWARD_NOTICE")
        cur.execute(
            _UPSERT,
            dict(
                code=r.code, kind=r.kind, channel="CONTRACT" if contract else "DIRECT_PURCHASE", title=r.title, state=r.state,
                authority_cui=r.authority_cui, authority_name=r.authority_name, supplier_cui=r.supplier_cui,
                supplier_name=r.supplier_name, cpv_code=r.cpv_code, cpv_description=r.cpv_description,
                contract_type=r.contract_type, published_on=r.published_on, quarter=r.quarter, award_date=r.award_date,
                estimated_bani=r.estimated_bani, value_bani=r.value_bani, counted_bani=r.value_bani,
                load_notes=list(r.notes), winners=Jsonb([{"name": w.name, "cui": w.cui} for w in winners]),
                notice_code=r.notice_code, contract_numbers=list(r.contract_numbers), procedure=r.procedure,
                concluded_by=r.concluded_by, initiation_code=r.initiation_code, lot_count=r.lot_count, via=r.via, url=r.url,
                ca_notice_id=r.ca_notice_id, sys_notice_type_id=r.sys_notice_type_id, sys_notice_version_id=r.sys_notice_version_id,
                source_file_id=source_file_id,
            ),
        )
        replaced = cur.fetchone()
        if replaced is None:  # unchanged, or older than what is stored
            continue
        if not replaced[0]:  # a version that replaces another: its search rows go
            cur.execute("DELETE FROM seap.search WHERE record_code = %s", (r.code,))
        doc = _search_doc(r)
        # one row per winner; an equal share of a consortium's value is the counting rule's (#65), so only a sole winner has one
        for position, w in enumerate(winners or (None,), start=1):
            cur.execute(
                """INSERT INTO seap.search (record_code, winner_position, winners, channel, award_date, award_year, value_bani,
                       counted_bani, share_bani, authority_cui, supplier_cui, doc)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (r.code, position, max(len(winners), 1), "CONTRACT" if contract else "DIRECT_PURCHASE", r.award_date, r.award_date.year,
                 r.value_bani, r.value_bani, r.value_bani if len(winners) <= 1 else None, r.authority_cui, w.cui if w else None, doc),
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


def iter_units(archive: Archive, summary: RebuildSummary, progress: Progress | None = None) -> Iterator[UnitOutcome]:
    """Read the archive one unit at a time: complete units only, each file validated; a failing unit is quarantined.

    Oldest fetch first, so a re-uploaded file (a later fetch of the same unit) is applied after the original. A file
    whose bytes were already planned is skipped. A file's (kind, sha) counts as planned only once its whole unit validates.
    """
    summary.incomplete = archive.incomplete()
    units = [u for u in archive.units() if u.source == "seap" and ((u.stream == "bulk" and u.kind in KINDS) or (u.stream == "crawl" and u.kind == CRAWL_KIND))]
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
                    keys.append(key)
        except InvalidFile as e:
            summary.quarantined.append(archive.quarantine(unit, e.reason, [p for p in e.problems if p]))
            yield UnitOutcome(index, len(units), unit, "quarantined", rows=rows, reason=e.reason)
            continue  # all or nothing: none of this unit's files load
        loaded.update(keys)
        yield UnitOutcome(index, len(units), unit, "loaded" if files else "skipped", files, rows,
                          None if files else ("no Records" if unit.stream == "crawl" else "same file already loaded"))


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


def rebuild(archive: Archive, db_url: str, progress: Progress | None = None) -> RebuildSummary:
    summary = RebuildSummary()
    number = 0
    try:
        with psycopg.connect(db_url) as conn, conn.cursor() as cur:
            cur.execute(SCHEMA_SQL.read_text(encoding="utf-8"))
            for o in iter_units(archive, summary, progress):
                for name, rows in o.files:
                    number += 1
                    crawled = o.unit.stream == "crawl"  # one source_file per Record kind of a crawled day: `name` is the kind
                    cur.execute(
                        "INSERT INTO seap.source_file (id, kind, unit, file_name, sha256, via, url, fetched_at, row_count, stream) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (number, name if crawled else KINDS[o.unit.kind].label, o.unit.unit, o.unit.unit if crawled else name,
                         sha256_of(o.unit.path / "manifest.json" if crawled else o.unit.file_path(name)),
                         None if crawled else o.unit.via, None if crawled else o.unit.url, o.unit.fetched_at, len(rows), o.unit.stream),
                    )
                    load_records(cur, number, rows)
                    summary.files_loaded += 1
                if progress:
                    progress.unit_done(o.index, o.total, o.unit.kind, o.unit.unit, len(o.unit.files), o.rows,
                                       sum(len(rows) for _, rows in o.files), o.status, o.reason)
            # crawled survivors: provisional until the bulk has reached their quarter, crawl-only once it has (and they have no match)
            cur.execute(
                """UPDATE seap.record r SET crawl_status = CASE WHEN EXISTS (
                       SELECT 1 FROM seap.source_file f WHERE f.stream = 'bulk' AND f.kind = r.kind AND f.unit = r.quarter)
                   THEN 'CRAWL_ONLY' ELSE 'PROVISIONAL' END WHERE r.via = 'CRAWL'""")
            through = crawl_through(archive)  # complete days with no hole before it; derived from the archive, so a rebuild reproduces it
            if through:
                cur.execute("INSERT INTO seap.crawl_state (stream, through) VALUES (%s, %s)", (CRAWL_KIND, through))
            cur.execute("SELECT count(*) FROM seap.record")
            summary.records = cur.fetchone()[0]
            cur.execute(DATA_THROUGH_SQL)
            data_through = dict(cur.fetchall())
            cur.execute("ANALYZE seap.record")
            cur.execute("ANALYZE seap.search")
    except BaseException as e:  # incl. KeyboardInterrupt / SystemExit: the transaction rolls back, the old schema stays
        if progress:
            progress.fail(e)
        raise
    if progress:
        progress.finish(summary.records, data_through)
    return summary
