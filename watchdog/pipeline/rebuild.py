"""`pipeline rebuild`: derive the graph from the raw archive into a fresh `seap` schema (ADR 0004).

Reads only units with a complete manifest, in archive order, and loads each file all or nothing. A file that fails
validation is moved to the quarantine area with a reason file and loads nothing. The whole rebuild is one transaction,
so a failed rebuild leaves the previous schema in place, and the same archive always gives the same database.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from .archive import Archive, Unit, sha256_of
from .da_bulk import DirectPurchase, InvalidFile, parse_da_file

SCHEMA_SQL = Path(__file__).parent / "sql" / "seap_schema.sql"


@dataclass
class RebuildSummary:
    files_loaded: int = 0
    records: int = 0
    quarantined: list[Path] = field(default_factory=list)
    incomplete: list[Path] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"loaded {self.records} records from {self.files_loaded} file(s)"]
        out += [f"quarantined: {p}" for p in self.quarantined]
        out += [f"skipped, incomplete (no valid manifest): {p}" for p in self.incomplete]
        return out


def fold(text: str) -> str:
    """The tracer's text folding: strip diacritics, lower-case, collapse spaces. (The search ticket owns the full rule.)"""
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped.lower()).strip()


def _search_doc(r: DirectPurchase) -> str:
    parts = [r.title, r.authority_name, r.supplier_name, r.cpv_code, r.cpv_description, r.code, r.authority_cui, r.supplier_cui]
    return fold(" ".join(p for p in parts if p))


def load_da_file(cur: psycopg.Cursor, source_file_id: int, rows: list[DirectPurchase]) -> None:
    for r in rows:
        award_date = r.awarded_on or r.published_on
        cur.execute(
            """INSERT INTO seap.record (code, kind, channel, title, state, authority_cui, authority_name, supplier_cui,
                   supplier_name, cpv_code, cpv_description, published_on, award_date, estimated_bani, value_bani,
                   counted_bani, source_file_id)
               VALUES (%s, 'DA', 'DIRECT_PURCHASE', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (code) DO UPDATE SET
                   title = EXCLUDED.title, state = EXCLUDED.state, authority_cui = EXCLUDED.authority_cui,
                   authority_name = EXCLUDED.authority_name, supplier_cui = EXCLUDED.supplier_cui,
                   supplier_name = EXCLUDED.supplier_name, cpv_code = EXCLUDED.cpv_code,
                   cpv_description = EXCLUDED.cpv_description, published_on = EXCLUDED.published_on,
                   award_date = EXCLUDED.award_date, estimated_bani = EXCLUDED.estimated_bani,
                   value_bani = EXCLUDED.value_bani, counted_bani = EXCLUDED.counted_bani,
                   source_file_id = EXCLUDED.source_file_id""",
            (r.code, r.title, r.state, r.authority_cui, r.authority_name, r.supplier_cui, r.supplier_name, r.cpv_code,
             r.cpv_description, r.published_on, award_date, r.estimated_bani, r.value_bani, r.value_bani, source_file_id),
        )
        cur.execute("DELETE FROM seap.search WHERE record_code = %s", (r.code,))
        cur.execute(
            """INSERT INTO seap.search (record_code, winner_position, winners, channel, award_date, award_year, value_bani,
                   counted_bani, share_bani, authority_cui, supplier_cui, doc)
               VALUES (%s, 1, 1, 'DIRECT_PURCHASE', %s, %s, %s, %s, %s, %s, %s, %s)""",
            (r.code, award_date, award_date.year, r.value_bani, r.value_bani, r.value_bani, r.authority_cui, r.supplier_cui,
             _search_doc(r)),
        )


@dataclass
class Plan:
    """What a rebuild will load: validated files in load order, plus what was set aside."""

    files: list[tuple[Unit, str, list[DirectPurchase]]]
    summary: RebuildSummary


def plan(archive: Archive) -> Plan:
    """Read the archive: complete units only, each file validated; a failing file's unit is quarantined."""
    summary = RebuildSummary(incomplete=archive.incomplete())
    units = [u for u in archive.units() if (u.source, u.stream, u.kind) == ("seap", "bulk", "da")]
    # oldest fetch first, so a re-uploaded file (a later fetch of the same unit) is applied after the original
    units.sort(key=lambda u: (u.fetched_at, str(u.path)))
    files: list[tuple[Unit, str, list[DirectPurchase]]] = []
    for unit in units:
        parsed = []
        try:
            for name in unit.files:
                parsed.append((unit, name, parse_da_file(unit.file_path(name))))
        except InvalidFile as e:
            summary.quarantined.append(archive.quarantine(unit, e.reason, [p for p in e.problems if p]))
            continue  # all or nothing: none of this unit's files load
        files.extend(parsed)
    return Plan(files, summary)


def rebuild(archive: Archive, db_url: str) -> RebuildSummary:
    the_plan = plan(archive)
    summary = the_plan.summary
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(SCHEMA_SQL.read_text(encoding="utf-8"))
        for number, (unit, name, rows) in enumerate(the_plan.files, start=1):
            cur.execute(
                "INSERT INTO seap.source_file (id, kind, unit, file_name, sha256, via, url, fetched_at, row_count) "
                "VALUES (%s, 'DA', %s, %s, %s, %s, %s, %s, %s)",
                (number, unit.unit, name, sha256_of(unit.file_path(name)), unit.via, unit.url, unit.fetched_at, len(rows)),
            )
            load_da_file(cur, number, rows)
            summary.files_loaded += 1
        cur.execute("SELECT count(*) FROM seap.record")
        summary.records = cur.fetchone()[0]
        cur.execute("ANALYZE seap.record")
        cur.execute("ANALYZE seap.search")
    return summary
