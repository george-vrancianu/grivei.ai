"""The financial-statements step of `pipeline rebuild` (#179): the archived MF files into `financials.source_file` and `financials.statement`.

Reads only the archive (never the network). For each fiscal year the first release's files are read, then the revised (`actualizat`) files: a CUI
the revised file holds takes the revised row (`revision` REVISED), every other CUI keeps its first-release row (FIRST). A file that does not parse
is named in the summary (`skipped`) and left out; the other release of that year still counts, so a broken upload never empties a year silently.
When one CUI is in two kinds of file of the same year and release, the earlier kind of `KIND_ORDER` wins (counted as a conflict).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date

import psycopg

from ..archive import Archive, Unit
from .fetch import KIND_ORDER, SOURCE, STREAM
from .read import FinancialsError, ReadStats, read_statements

log = logging.getLogger("pipeline.financials")
RELEASES = ("first", "revised")


@dataclass
class FinancialsSummary:
    fiscal_years: list[int] = field(default_factory=list)
    files: int = 0
    statements: int = 0
    conflicts: int = 0
    skipped: list[str] = field(default_factory=list)  # files that did not parse
    incomplete: list[str] = field(default_factory=list)  # fetch directories whose manifest or files do not check out

    def line(self) -> str:
        extra = "".join(f"; skipped {s}" for s in self.skipped) + "".join(f"; incomplete {s}" for s in self.incomplete)
        if not self.files:
            return "financials: none archived (run `pipeline fetch-financials`): no entity page shows statements" + extra
        return (f"financials: fiscal years {self.fiscal_years[0]}-{self.fiscal_years[-1]}, {self.files} files, {self.statements} statements"
                + (f", {self.conflicts} CUIs in two kinds of file" if self.conflicts else "") + extra)


def parse_unit(unit: str) -> tuple[int, str] | None:
    """`2024-revised` -> (2024, 'revised'); None for a stray directory."""
    year, _, release = unit.partition("-")
    return (int(year), release) if year.isdigit() and release in RELEASES else None


def held_units(archive: Archive) -> tuple[list[tuple[Unit, int, str]], list[str]]:
    """The financials units (the newest fetch of each kind/year/release only) and the incomplete directories. Hashes only this source's files."""
    root = archive.root / SOURCE
    latest: dict[tuple[str, int, str], tuple[Unit, int, str]] = {}
    incomplete: list[str] = []
    for unit, directory in archive.survey(keep=lambda d: d.is_relative_to(root)):
        if unit is None:
            incomplete.append(str(directory.relative_to(archive.root)))
            continue
        parsed = parse_unit(unit.unit) if (unit.source, unit.stream) == (SOURCE, STREAM) and unit.kind in KIND_ORDER else None
        if parsed is None:
            continue
        key = (unit.kind, *parsed)
        if key not in latest or (unit.fetched_at, str(unit.path)) > (latest[key][0].fetched_at, str(latest[key][0].path)):
            latest[key] = (unit, *parsed)
    return list(latest.values()), incomplete


def data_file(unit: Unit) -> str | None:
    return next((f for f in unit.files if f.lower().endswith(".txt")), None)


def _published(origin: dict) -> date | None:
    try:
        return date.fromisoformat(str(origin.get("lastModified") or "")[:10])
    except ValueError:
        return None


def build_financials(cur: psycopg.Cursor, archive: Archive) -> FinancialsSummary:
    held, summary_incomplete = held_units(archive)
    summary = FinancialsSummary(incomplete=summary_incomplete)
    file_id = 0
    years = sorted({year for _, year, _ in held})
    for year in years:
        current: dict[str, tuple] = {}  # cui -> row for this fiscal year, the revised file's row replacing the first release's
        for release in RELEASES:
            staged: dict[str, tuple] = {}
            for kind in KIND_ORDER:
                found = next(((u, y, r) for u, y, r in held if u.kind == kind and y == year and r == release), None)
                name = data_file(found[0]) if found else None
                if found is None or name is None:
                    continue
                unit = found[0]
                path = unit.file_path(name)
                stats = ReadStats()
                rows: list[tuple] = []
                try:
                    for s in read_statements(path, stats):
                        rows.append(s)
                except FinancialsError as e:
                    summary.skipped.append(f"{unit.path.relative_to(archive.root)}: {e}")
                    log.warning("financials %s skipped: %s", path, e)
                    continue
                if not rows:
                    summary.skipped.append(f"{unit.path.relative_to(archive.root)}: no rows")
                    continue
                file_id += 1
                origin = unit.origin or {}
                cur.execute(
                    "INSERT INTO financials.source_file (id, fiscal_year, kind, revision, file_name, archive_path, dataset_url, dataset_title, resource_url, license,"
                    " published, fetched_at, row_count) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (file_id, year, kind, release.upper(), name, str(path.relative_to(archive.root)), origin.get("datasetUrl"), origin.get("datasetTitle"),
                     origin.get("url") or unit.url, origin.get("license"), _published(origin), unit.fetched_at, len(rows)))
                summary.files += 1
                for s in rows:
                    if s.cui in staged and staged[s.cui][1] != file_id:
                        summary.conflicts += 1
                        continue  # the earlier kind of the same release keeps the CUI
                    staged[s.cui] = (s, file_id)
            for cui, (s, fid) in staged.items():
                current[cui] = (s, fid, release.upper())
        if not current:
            continue
        summary.fiscal_years.append(year)
        with cur.copy("COPY financials.statement (cui, fiscal_year, revision, turnover_bani, profit_loss_bani, debts_bani, equity_bani, employees, source_file_id) FROM STDIN") as copy:
            for cui, (s, fid, revision) in current.items():
                copy.write_row((cui, year, revision, _bani(s.turnover), _bani(s.profit_loss), _bani(s.debts), _bani(s.equity), s.employees, fid))
        summary.statements += len(current)
    return summary


def _bani(lei: int | None) -> int | None:
    return None if lei is None else lei * 100
