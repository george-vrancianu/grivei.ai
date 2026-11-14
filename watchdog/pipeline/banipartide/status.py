"""BaniPartide's part of `pipeline status`: the held copy, its data-through year and its counts, read from the archive (no database)."""
from __future__ import annotations

from datetime import date

from ..archive import Archive
from .build import held_unit
from .fetch import FILE_NAME
from .read import BaniPartideError, ReadStats, read_donations


def data_through_year(archive: Archive) -> int | None:
    """The newest year any firm donation in the held copy covers (None: nothing held or nothing readable)."""
    unit, _ = held_unit(archive)
    if unit is None:
        return None
    try:
        return max((d.year for d in read_donations(unit.file_path(FILE_NAME)) if d.year is not None), default=None)
    except (BaniPartideError, OSError, ValueError):
        return None


def describe(archive: Archive) -> list[str]:
    unit, incomplete = held_unit(archive)
    if unit is None:
        return (["", "banipartide firm donations: no complete copy held"] + [f"  incomplete: {p}" for p in incomplete]) if incomplete else []
    origin = unit.origin or {}
    stats = ReadStats()
    try:
        years = [d.year for d in read_donations(unit.file_path(FILE_NAME), stats) if d.year is not None]
    except (BaniPartideError, OSError, ValueError) as e:
        return ["", f"banipartide firm donations: the held copy does not parse ({e})"]
    lines = ["", f"banipartide firm donations (Expert Forum, {origin.get('license') or 'licence not recorded'}): one-off archived load, refresh only checks for a newer upstream file",
             f"  copy of {unit.fetched_at.date()} (database {str(origin.get('databaseHash') or '')[:12]}): {stats.rows} rows, {stats.firms} CUI-keyed firm donations and loans, "
             f"{stats.no_cui} not CUI-keyed (never loaded)"]
    if years:
        lines.append(f"  data through {max(years)} (end {date(max(years), 12, 31)}); years {min(years)}-{max(years)}; the newest years may be incomplete")
    lines += [f"  incomplete: {p}" for p in incomplete]
    return lines
