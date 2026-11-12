"""The hand-edited known-gaps file: quarters of a record kind that the Source itself lacks, each with the operator's reason.

CSV with a header `quarter,kind,reason`: quarter `2025-Q2` (or `2025Q2`), kind one of `grid.KINDS`, reason free text shown
verbatim as the gap's note (source data: never translated). Blank lines and lines starting with `#` are skipped. The default
file is `known_gaps.csv` beside this module; `--known-gaps` / env PIPELINE_KNOWN_GAPS point a rebuild at another (tests).
"""
from __future__ import annotations

import csv
from pathlib import Path

from .grid import KINDS, Quarter, parse_quarter

DEFAULT_KNOWN_GAPS = Path(__file__).parent / "known_gaps.csv"


def load_known_gaps(path: Path | str | None = None) -> dict[tuple[str, Quarter], str]:
    path = Path(path or DEFAULT_KNOWN_GAPS)
    with path.open(encoding="utf-8", newline="") as f:
        lines = [line for line in f if line.strip() and not line.lstrip().startswith("#")]
    out: dict[tuple[str, Quarter], str] = {}
    for number, row in enumerate(csv.DictReader(lines), start=1):
        try:
            kind, quarter, reason = row["kind"].strip().upper(), parse_quarter(row["quarter"]), (row["reason"] or "").strip()
        except (KeyError, ValueError, AttributeError) as e:
            raise ValueError(f"{path}: entry {number}: {e}") from e
        if kind not in KINDS or not reason:
            raise ValueError(f"{path}: entry {number}: kind must be one of {', '.join(KINDS)} and the reason is required")
        out[(kind, quarter)] = reason
    return out
