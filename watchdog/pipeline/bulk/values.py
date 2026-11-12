"""Cell-level parsing shared by every bulk file kind: dates, money (integer bani), CUIs and text.

A cell is whatever the reader produced: a `str` (CSV, and text cells in XLSX), an `int`/`float` (numeric XLSX cells), a
`datetime` (date-formatted XLSX cells) or `None`. Every parser raises `ValueError` for a value it cannot read, which
makes the whole file invalid (nothing is guessed).
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

Cell = str | int | float | datetime | date | None

_SCI = re.compile(r"^[+-]?\d+(\.\d+)?[eE][+-]?\d+$")
_PLAIN = re.compile(r"^[+-]?\d+(\.\d+)?$")
_THOUSANDS = re.compile(r"^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$")
_US_DATE = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$")
_ISO_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?$")
EXCEL_EPOCH = date(1899, 12, 30)  # serial 1 = 1900-01-01 once Excel's phantom 1900-02-29 is accounted for


def text(cell: Cell) -> str:
    """A text field: stripped; numbers written the way a spreadsheet user would read them."""
    if cell is None:
        return ""
    if isinstance(cell, str):
        return cell.strip()
    if isinstance(cell, bool):
        raise ValueError(f"not text: {cell!r}")
    if isinstance(cell, float):
        return str(int(cell)) if cell.is_integer() else repr(cell)
    return str(cell).strip()


def to_date(cell: Cell) -> date | None:
    """A date or timestamp -> its calendar date, as written (the Source's local time; no zone conversion).

    Strings: `MM/DD/YYYY` with an optional time (the DA and DAN bulk shape; a day above 12 proves it is month-first), or
    ISO `YYYY-MM-DD`. XLSX: a date cell, or an Excel serial number. Anything else is an error, never a guess.
    """
    if cell is None:
        return None
    if isinstance(cell, datetime):
        return cell.date()
    if isinstance(cell, date):
        return cell
    if isinstance(cell, bool):
        raise ValueError(f"not a date: {cell!r}")
    if isinstance(cell, (int, float)):
        if not 1 <= cell < 2958466:  # 9999-12-31
            raise ValueError(f"not a date serial: {cell!r}")
        return EXCEL_EPOCH + timedelta(days=int(cell))
    s = cell.strip()
    if not s:
        return None
    if m := _US_DATE.match(s):
        return date(int(m[3]), int(m[1]), int(m[2]))
    if m := _ISO_DATE.match(s):
        return date(int(m[1]), int(m[2]), int(m[3]))
    raise ValueError(f"not a MM/DD/YYYY date: {s!r}")


def to_bani(cell: Cell) -> tuple[int | None, bool]:
    """A RON amount -> (integer bani, whether it was written in scientific notation).

    Accepts `1200.5`, comma thousands separators (`5,089`, `1,234,567.50`: the 2024 Q2 DAN CSV) and numeric cells. A value
    in scientific notation (`1.2345E+6`, Excel's mangling of a long number) is read exactly as written and flagged: its
    trailing digits are already lost, so the counting rule (#65) must treat it as suspect. A lone comma followed by one
    or two digits (`5,5`) is ambiguous (decimal comma?) and an error. Rounds half to even to whole bani.
    """
    if cell is None:
        return None, False
    if isinstance(cell, bool) or isinstance(cell, (date, datetime)):
        raise ValueError(f"not an amount: {cell!r}")
    mangled = False
    if isinstance(cell, int):
        value = Decimal(cell)
    elif isinstance(cell, float):
        value = Decimal(repr(cell))
    else:
        s = cell.strip().replace(" ", "").replace(" ", "")
        if not s:
            return None, False
        if _PLAIN.match(s):
            value = Decimal(s)
        elif _THOUSANDS.match(s):
            value = Decimal(s.replace(",", ""))
        elif _SCI.match(s):
            value, mangled = Decimal(s), True
        else:
            raise ValueError(f"not an amount: {s!r}")
    try:
        return int((value * 100).quantize(Decimal(1))), mangled
    except InvalidOperation:
        raise ValueError(f"not an amount: {cell!r}") from None


def to_cui(cell: Cell) -> tuple[str | None, str | None]:
    """A Romanian tax code -> (clean digit string without `RO`, note).

    A numeric XLSX cell (`18308578`, or `18308578.0` from a float) comes out as bare digits. Text keeps its digits; an `RO`
    prefix and spaces go. A scientific-notation text (`1.00761E+12`: the digits after the sixth are gone) cannot be
    recovered: no CUI, note `scientific_notation`. Anything else that is not digits: no CUI, note `unusable`. A blank cell
    is no CUI and no note.
    """
    if cell is None:
        return None, None
    if isinstance(cell, bool) or isinstance(cell, (date, datetime)):
        return None, "unusable"
    if isinstance(cell, int):
        return (str(cell), None) if cell > 0 else (None, "unusable")
    if isinstance(cell, float):
        if cell.is_integer() and cell > 0:
            return str(int(cell)), None
        return None, "unusable"
    s = re.sub(r"^RO\s*", "", cell.strip(), flags=re.IGNORECASE)
    s = re.sub(r"\s+", "", s)
    if not s:
        return None, None
    if _SCI.match(s):
        return None, "scientific_notation"
    if m := re.fullmatch(r"(\d+)\.0+", s):  # a number that went through a float: `18308578.0`
        s = m[1]
    return (s, None) if s.isdigit() else (None, "unusable")
