"""AMEPIP's part of `pipeline status`: the newest archived list, its data-through date and its counts, read from the archive."""
from __future__ import annotations

from collections import Counter

from ..archive import Archive
from .build import latest_units, newest_list, snapshot_of


def describe(archive: Archive) -> list[str]:
    units = latest_units(archive)
    if not units:
        return []
    found = newest_list(archive)
    lines = ["", f"amepip list (public enterprises, OUG 109/2011): {len(units)} snapshot(s) held"]
    if found is None:
        return lines + ["  newest: none parses (the rebuild flags no entity); see `pipeline fetch-amepip`"]
    unit, name, rows, skipped = found
    years = [y for r in rows for y in (r.first_year, r.last_year) if y is not None]
    through = snapshot_of(unit)
    lines += [f"  data through {through} (published by AMEPIP), fetched {unit.fetched_at.date()}: {len(rows)} public enterprises (CUIs)",
              f"  file {unit.path.relative_to(archive.root) / name}" + (f"; financial years {min(years)}-{max(years)}" if years else "")]
    by_status = Counter(r.status or "(none)" for r in rows)
    lines.append("  by ONRC status: " + ", ".join(f"{s} {n}" for s, n in by_status.most_common(4)) + (", ..." if len(by_status) > 4 else ""))
    lines += [f"  skipped (does not parse): {s}" for s in skipped]
    return lines
