"""AEP's part of `pipeline status`: which election rounds are archived, with the one-off 2025 file's stated data-through date."""
from __future__ import annotations

from ..archive import Archive
from .build import _units


def describe(archive: Archive) -> list[str]:
    units = _units(archive)
    if not units:
        return []
    lines = ["", "aep local elections (Mandates and Party, ADR 0012)"]
    for u in sorted(units, key=lambda u: (u.unit, u.stream, u.fetched_at)):
        through = (u.origin or {}).get("dataThrough")
        lines.append(f"  {u.stream}/{u.unit}: {len(u.files)} files, fetched {u.fetched_at.date()}" + (f"; one-off file, data through {through}, never refreshed automatically" if through else ""))
    return lines
