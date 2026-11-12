"""`pipeline rebuild`: derive the graph from the raw archive into a fresh `seap` schema (ADR 0004).

Reads only units with a complete manifest, oldest fetch first, and loads each file all or nothing (SEAP bulk files of
every registered kind: DA, DAN). A file that fails
validation is moved to the quarantine area with a reason file and loads nothing. The whole rebuild is one transaction,
so a failed rebuild leaves the previous schema in place, and the same archive always gives the same database.

A re-uploaded file loads like any file and per-code precedence decides (ADR 0002, 2026-11-11 amendment): the later
publication wins, an older re-upload cannot overwrite newer data, and a quarter is never replaced wholesale, so records
absent from a re-upload are kept.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from .archive import Archive, Unit, sha256_of
from .bulk import KINDS, BulkRecord, InvalidFile, parse_file

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


def _search_doc(r: BulkRecord) -> str:
    parts = [r.title, r.authority_name, r.supplier_name, r.cpv_code, r.cpv_description, r.code, r.authority_cui, r.supplier_cui]
    return fold(" ".join(p for p in parts if p))


# The columns whose change means "different content". Not source_file_id: the same Record from a re-uploaded copy is no change.
_CONTENT = (
    "kind", "channel", "title", "state", "authority_cui", "authority_name", "supplier_cui", "supplier_name", "cpv_code",
    "cpv_description", "contract_type", "published_on", "quarter", "award_date", "estimated_bani", "value_bani",
    "counted_bani", "load_notes",
)
_UPSERT = f"""
INSERT INTO seap.record (code, {", ".join(_CONTENT)}, source_file_id)
VALUES (%(code)s, {", ".join(f"%({c})s" for c in _CONTENT)}, %(source_file_id)s)
ON CONFLICT (code) DO UPDATE SET {", ".join(f"{c} = EXCLUDED.{c}" for c in _CONTENT)}, source_file_id = EXCLUDED.source_file_id
WHERE EXCLUDED.published_on > seap.record.published_on
   OR (EXCLUDED.published_on = seap.record.published_on
       AND ROW({", ".join(f"EXCLUDED.{c}" for c in _CONTENT)}) IS DISTINCT FROM ROW({", ".join(f"seap.record.{c}" for c in _CONTENT)}))
RETURNING code
"""


def load_records(cur: psycopg.Cursor, source_file_id: int, rows: list[BulkRecord]) -> None:
    """Upsert Records by public code. A code that is already there is replaced only by a later publication date, or by
    the same date with different content (the later file wins a tie), so a re-uploaded old file cannot overwrite newer
    data and the same content twice changes nothing."""
    for r in rows:
        cur.execute(
            _UPSERT,
            dict(
                code=r.code, kind=r.kind, channel="DIRECT_PURCHASE", title=r.title, state=r.state,
                authority_cui=r.authority_cui, authority_name=r.authority_name, supplier_cui=r.supplier_cui,
                supplier_name=r.supplier_name, cpv_code=r.cpv_code, cpv_description=r.cpv_description,
                contract_type=r.contract_type, published_on=r.published_on, quarter=r.quarter, award_date=r.award_date,
                estimated_bani=r.estimated_bani, value_bani=r.value_bani, counted_bani=r.value_bani,
                load_notes=list(r.notes), source_file_id=source_file_id,
            ),
        )
        if cur.fetchone() is None:  # unchanged, or older than what is stored
            continue
        cur.execute("DELETE FROM seap.search WHERE record_code = %s", (r.code,))
        cur.execute(
            """INSERT INTO seap.search (record_code, winner_position, winners, channel, award_date, award_year, value_bani,
                   counted_bani, share_bani, authority_cui, supplier_cui, doc)
               VALUES (%s, 1, 1, 'DIRECT_PURCHASE', %s, %s, %s, %s, %s, %s, %s, %s)""",
            (r.code, r.award_date, r.award_date.year, r.value_bani, r.value_bani, r.value_bani, r.authority_cui, r.supplier_cui,
             _search_doc(r)),
        )


@dataclass
class Plan:
    """What a rebuild will load: validated files in load order, plus what was set aside."""

    files: list[tuple[Unit, str, list[BulkRecord]]]
    summary: RebuildSummary


def plan(archive: Archive) -> Plan:
    """Read the archive: complete units only, each file validated; a failing file's unit is quarantined."""
    summary = RebuildSummary(incomplete=archive.incomplete())
    units = [u for u in archive.units() if u.source == "seap" and u.stream == "bulk" and u.kind in KINDS]
    # oldest fetch first, so a re-uploaded file (a later fetch of the same unit) is applied after the original
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    files: list[tuple[Unit, str, list[BulkRecord]]] = []
    loaded: set[tuple[str, str]] = set()  # (kind, sha256) of files already planned
    for unit in units:
        parsed = []
        keys = []  # recorded as loaded only once the whole unit validates
        try:
            for name in unit.files:
                path = unit.file_path(name)
                key = (unit.kind, sha256_of(path))
                if key in loaded or key in keys:  # the same bytes again (a re-fetch of an unchanged file): nothing to load
                    summary.duplicate_files.append(path)
                    continue
                parsed.append((unit, name, parse_file(unit.kind, unit.unit, path)))
                keys.append(key)
        except InvalidFile as e:
            summary.quarantined.append(archive.quarantine(unit, e.reason, [p for p in e.problems if p]))
            continue  # all or nothing: none of this unit's files load
        files.extend(parsed)
        loaded.update(keys)
    return Plan(files, summary)


def rebuild(archive: Archive, db_url: str) -> RebuildSummary:
    the_plan = plan(archive)
    summary = the_plan.summary
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(SCHEMA_SQL.read_text(encoding="utf-8"))
        for number, (unit, name, rows) in enumerate(the_plan.files, start=1):
            cur.execute(
                "INSERT INTO seap.source_file (id, kind, unit, file_name, sha256, via, url, fetched_at, row_count) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (number, KINDS[unit.kind].label, unit.unit, name, sha256_of(unit.file_path(name)), unit.via, unit.url,
                 unit.fetched_at, len(rows)),
            )
            load_records(cur, number, rows)
            summary.files_loaded += 1
        cur.execute("SELECT count(*) FROM seap.record")
        summary.records = cur.fetchone()[0]
        cur.execute("ANALYZE seap.record")
        cur.execute("ANALYZE seap.search")
    return summary
