"""ONRC's part of `pipeline status`: the snapshots held, how many registrations the newest lists, and the data-through date.

It is the `status` hook of ONRC's entry in `sources.py` and reads only the archive's manifests (nothing is parsed, nothing hashed). The data-through
date is the newest held snapshot's: ONRC publishes a whole register at a date, so the Source is complete up to it. A month since March 2026 with
no held snapshot is a known gap (the monthly snapshots are the ones birth dates and the page's status dates rest on)."""
from __future__ import annotations

from datetime import date

from ..archive import Archive
from .fetch import MONTHLY_FROM, held_snapshots


def _rows(origin: dict) -> int | None:
    counted = [r.get("rows") for r in origin.get("resources") or [] if r.get("role") in ("firme", "legacy") and r.get("rows") is not None]
    return sum(counted) if counted else None


def missing_months(held: list[date]) -> list[str]:
    """Calendar months from `MONTHLY_FROM` to the newest held snapshot with no held snapshot (`YYYY-MM`)."""
    if not held:
        return []
    have = {(d.year, d.month) for d in held}
    out, (y, m) = [], (MONTHLY_FROM.year, MONTHLY_FROM.month)
    while (y, m) <= (max(held).year, max(held).month):
        if (y, m) not in have:
            out.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def describe(archive: Archive) -> list[str]:
    held = held_snapshots(archive)
    if not held:
        return []
    dates = sorted(date.fromisoformat(d) for d in held)
    newest = dates[-1]
    layouts = {d: held[d.isoformat()][-1].get("layout") for d in dates}
    lines = ["", f"onrc: {len(dates)} snapshot(s) held ({sum(1 for d in dates if d >= MONTHLY_FROM)} monthly since {MONTHLY_FROM:%Y-%m}, {sum(1 for d in dates if d < MONTHLY_FROM)} earlier quarterly), "
             f"{dates[0]} .. {newest}; {sum(1 for v in layouts.values() if v == 'current')} in the current layout"]
    rows = _rows(held[newest.isoformat()][-1])
    lines.append(f"onrc: data through {newest}" + (f"; the newest snapshot lists {rows} registrations" if rows is not None else ""))
    if gaps := missing_months(dates):
        lines.append(f"onrc: no snapshot held for {', '.join(gaps[:12])}" + (f" and {len(gaps) - 12} more" if len(gaps) > 12 else "") + " (known gaps: statuses first seen in the next snapshot are dated late)")
    return lines


def describe_status(archive: Archive, args, rebuild_status: dict | None, anaf_status: dict | None, code: int) -> int:
    """Print ONRC's section; ONRC never changes the exit code (a failing fetch shows in the refresh section and its run's exit code)."""
    for line in describe(archive):
        print(line)
    return code
