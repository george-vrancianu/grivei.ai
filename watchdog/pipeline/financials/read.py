"""Reads one archived MF financial-statements file (`WEB_BL_BS_SL_AN<year>.txt`, `WEB_UU_AN<year>.txt` or `WEB_IR_AN<year>.txt`) into one row per company.

The real files (checked on data.gov.ro, FY2021-FY2025) are comma-separated text with CRLF line ends and the header
`CUI,CAEN,I1,...,I20`. MF's own column list (`WEB_BL_BS_SL_AN20xx.csv`, the `;`-separated companion file) names the indicators:

    I7 DATORII, I10 CAPITALURI - TOTAL, I13 Cifra de afaceri neta, I16/I17 profit/pierdere bruta, I18/I19 profit/pierdere neta,
    I20 Numar mediu de salariati

Amounts are whole lei. A blank cell is `None`: a blank employee count is "not reported" and never 0 (a cell that says 0 is a reported 0).
Profit or loss is the net profit minus the net loss (negative is a loss), and `None` only when both cells are blank.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from ..mf.build import normalise_cui


class FinancialsError(Exception):
    pass


@dataclass(frozen=True)
class Statement:
    cui: str  # normalised like an entity key: no RO, no leading zeros
    turnover: int | None  # whole lei
    profit_loss: int | None
    debts: int | None
    equity: int | None
    employees: int | None


@dataclass
class ReadStats:
    rows: int = 0
    bad_cui: int = 0  # rows with no usable CUI (dropped)
    bad_values: int = 0  # cells that are not a number (read as blank)
    duplicates: int = 0  # a CUI seen again in the same file (the later row wins)
    seen: set[str] = field(default_factory=set)


REQUIRED = ("CUI", "I7", "I10", "I13", "I18", "I19", "I20")
_INT = re.compile(r"^-?\d+$")
_DECIMAL = re.compile(r"^-?\d+[.,]\d+$")


def _number(text: str, stats: ReadStats | None) -> int | None:
    text = text.strip()
    if not text:
        return None
    if _INT.match(text):
        return int(text)
    if _DECIMAL.match(text):
        return round(float(text.replace(",", ".")))
    if stats is not None:
        stats.bad_values += 1
    return None


def _header(first: list[str]) -> dict[str, int]:
    index = {name.strip().upper(): i for i, name in enumerate(first)}
    missing = [c for c in REQUIRED if c not in index]
    if missing:
        raise FinancialsError(f"not a financial-statements file: no column {', '.join(missing)} (header: {','.join(first[:6])}...)")
    return index


def check_file(path: Path) -> None:
    """Cheap validation of a download: the header names the columns we read and the first data row has a CUI. Raises FinancialsError."""
    with path.open(encoding="latin-1", newline="") as f:
        rows = csv.reader(f)
        try:
            index = _header(next(rows))
        except StopIteration:
            raise FinancialsError("empty file") from None
        row = next(rows, None)
        if row is None:
            raise FinancialsError("no data rows")
        if not normalise_cui(row[index["CUI"]] if index["CUI"] < len(row) else ""):
            raise FinancialsError("the first row has no CUI")


def read_statements(path: Path, stats: ReadStats | None = None) -> Iterator[Statement]:
    """Every row with a usable CUI, streamed (the bulk files hold up to 700,000 rows). A file whose header lacks a column raises FinancialsError."""
    with path.open(encoding="latin-1", newline="") as f:
        rows = csv.reader(f)
        try:
            index = _header(next(rows))
        except StopIteration:
            raise FinancialsError("empty file") from None
        pos = {name: index[name] for name in REQUIRED}
        width = max(pos.values()) + 1
        for row in rows:
            if not row:
                continue
            if stats is not None:
                stats.rows += 1
            cui = normalise_cui(row[pos["CUI"]])
            if not cui:
                if stats is not None:
                    stats.bad_cui += 1
                continue
            row = row + [""] * (width - len(row))
            profit, loss = _number(row[pos["I18"]], stats), _number(row[pos["I19"]], stats)
            if stats is not None:
                if cui in stats.seen:
                    stats.duplicates += 1
                stats.seen.add(cui)
            yield Statement(cui, _number(row[pos["I13"]], stats), None if profit is None and loss is None else (profit or 0) - (loss or 0),
                            _number(row[pos["I7"]], stats), _number(row[pos["I10"]], stats), _number(row[pos["I20"]], stats))
