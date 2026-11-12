"""Gathers what the Coverage grid needs (the rebuild's loaded files, the quarantine area, the backfill's complete weeks, the crawl's
data-through, the Records in the graph) and stores the computed grid in `seap.coverage_cell`. The rules are in grid.py."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

import psycopg

from ..archive import QUARANTINE_DIR, Archive
from ..bulk import KINDS as BULK_KINDS
from ..crawl.backfill import FIRST_DAY, LAST_DAY_2021_22, PASS_2021_22, Week, complete_weeks, is_complete, week_windows
from .grid import Cell, CellFacts, Inputs, Quarter, compute_grid, first_day, last_day, parse_quarter, quarters_to
from .known_gaps import load_known_gaps

_LABEL_OF_DIR = {directory: spec.label for directory, spec in BULK_KINDS.items()}  # 'fara-anunt' -> 'AWARD_NOTICE'


def quarantined_cells(archive: Archive) -> set[tuple[str, Quarter]]:
    """(kind, quarter) of every bulk unit in the quarantine area. Read from the directory names, so a later rebuild (the unit is
    already there) gives the same answer as the one that moved it."""
    base = archive.root / QUARANTINE_DIR
    out: set[tuple[str, Quarter]] = set()
    for unit_dir in archive.quarantined():
        parts = unit_dir.relative_to(base).parts  # <source>/<stream>/<kind>/<unit>/<day>
        if len(parts) == 5 and parts[0] == "seap" and parts[1] == "bulk" and parts[2] in _LABEL_OF_DIR and re.fullmatch(r"\d{4}Q[1-4]", parts[3]):
            out.add((_LABEL_OF_DIR[parts[2]], parse_quarter(parts[3])))
    return out


def backfilled_quarters(archive: Archive) -> set[Quarter]:
    """The 2021-22 quarters whose every planned backfill week (pass 2021-22) is complete in the archive: a week that spans two quarters
    counts for both."""
    held = complete_weeks(archive)
    windows = week_windows(FIRST_DAY, LAST_DAY_2021_22)
    out = set()
    for q in quarters_to(LAST_DAY_2021_22):
        overlapping = [(a, b) for a, b in windows if a <= last_day(q) and b >= first_day(q)]
        if overlapping and all(is_complete(held, Week(PASS_2021_22, a, b)) for a, b in overlapping):
            out.add(q)
    return out


def read_facts(cur: psycopg.Cursor) -> dict[tuple[str, Quarter], CellFacts]:
    cur.execute("SELECT kind, quarter, count(*), count(*) FILTER (WHERE via = 'CRAWL'), max(published_on) FROM seap.record GROUP BY kind, quarter")
    return {(kind, parse_quarter(quarter)): CellFacts(records, crawled, latest) for kind, quarter, records, crawled, latest in cur.fetchall()}


def gather(cur: psycopg.Cursor, archive: Archive, today: date, bulk_rows: dict[tuple[str, Quarter], int], known_gaps_path: Path | str | None = None) -> Inputs:
    """`bulk_rows`: per (kind, quarter), the data rows of the largest loaded bulk file (the rebuild counts them as it reads)."""
    cur.execute("SELECT kind, through FROM seap.crawl_state")
    return Inputs(
        today=today,
        bulk_rows=bulk_rows,
        quarantined=quarantined_cells(archive) - set(bulk_rows),
        facts=read_facts(cur),
        crawl_through=dict(cur.fetchall()),
        backfilled=backfilled_quarters(archive),
        known_gaps=load_known_gaps(known_gaps_path),
    )


def store(cur: psycopg.Cursor, cells: list[Cell]) -> None:
    cur.executemany(
        "INSERT INTO seap.coverage_cell (quarter, kind, state, rule, note, records, data_through) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        [(c.quarter, c.kind, c.state, c.rule, c.note, c.records, c.data_through) for c in cells],
    )


def build_coverage(cur: psycopg.Cursor, archive: Archive, today: date, bulk_rows: dict[tuple[str, Quarter], int], known_gaps_path: Path | str | None = None) -> list[Cell]:
    """The end of a rebuild, inside its transaction: compute the grid from the graph just loaded and the archive, and store it."""
    cells = compute_grid(gather(cur, archive, today, bulk_rows, known_gaps_path))
    store(cur, cells)
    return cells
