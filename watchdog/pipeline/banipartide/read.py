"""Reads BaniPartide's table of firm donors ("Donatori persoane juridice") from the raw archive (ticket #182).

The table is Expert Forum's (CC BY 4.0): one row per donor, party and year as the party's annual publication lists it. Columns (the real ones):

    rowid, Nume, Suma, An, Partid, Tip donație, CUI, Reprezentant societate, Sediu, Naționalitatea donatorului, Data donației, Felul donației, Filiala partidului

Only CUI-keyed rows are firms (ADR 0009: individual donors never reach the graph). The firm table also holds a few rows that are not: a truncated CNP written
as a number (`1,85E+12`) beside a `P.F.` name, `n/a`, a CUI that fails the check digit, an empty id (some loans). They are dropped here and only COUNTED:
no name, id or amount of a dropped row is kept. The donor's published name is not read at all (the graph names a firm by its CUI's entity), and the representative's
name is stripped at fetch (`fetch.py`). Dirty cells are read conservatively: a date is set only when exactly one calendar date can be read from the cell and it falls
in the row's year; otherwise the verbatim text and the year are all that is kept.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterator

from ..identity import classify_tax_id

REQUIRED = ("rowid", "Suma", "An", "Partid", "Tip donație", "CUI", "Data donației")
KINDS = {"Donatii p. juridice": "DONATION", "Imprumuturi p. juridice": "LOAN"}  # BaniPartide's `Tip donație`; the loan table's own label
_MONTHS = {"ianuarie": 1, "februarie": 2, "martie": 3, "aprilie": 4, "mai": 5, "iunie": 6, "iulie": 7, "august": 8, "septembrie": 9, "octombrie": 10, "noiembrie": 11, "decembrie": 12}


class BaniPartideError(ValueError):
    """The file is not BaniPartide's firm-donor table."""


@dataclass(frozen=True)
class Donation:
    row_id: int  # BaniPartide's `rowid` in the table export (what a citation points at)
    cui: str  # normalised: no `RO`, no leading zeros (an entity's key)
    party: str  # `Partid` exactly as published, never normalised (the party-name equivalence table is #185's)
    year: int | None  # `An`
    date: date | None  # only when one date is readable from `Data donației` and it falls in `year`
    date_text: str  # `Data donației` as published
    amount_bani: int  # `Suma` in RON x 100
    kind: str  # DONATION | LOAN


@dataclass
class ReadStats:
    rows: int = 0
    firms: int = 0  # kept
    no_cui: int = 0  # not CUI-keyed (an individual's truncated CNP, `n/a`, a CUI failing the check digit, blank): counted, never kept
    bad_amount: int = 0
    unknown_kind: int = 0


def check_header(fields: list[str] | None) -> None:
    missing = [c for c in REQUIRED if c not in (fields or [])]
    if missing:
        raise BaniPartideError(f"not BaniPartide's firm-donor table: missing column(s) {', '.join(missing)}")


def check_file(path: Path) -> None:
    with path.open(encoding="utf-8", newline="") as f:
        check_header(csv.DictReader(f).fieldnames)


def parse_amount(text: str) -> int | None:
    """`Suma` in whole or decimal lei (`30000`, `8005.36`, `17417,6`) as bani; None when it does not read or is not positive."""
    s = re.sub(r"[\s ]", "", text or "")
    if not s:
        return None
    if "," in s and "." in s:  # the last separator is the decimal one
        decimal = "," if s.rfind(",") > s.rfind(".") else "."
        s = s.replace("." if decimal == "," else ",", "").replace(decimal, ".")
    else:
        s = s.replace(",", ".")
    try:
        value = Decimal(s)
    except InvalidOperation:
        return None
    bani = int((value * 100).to_integral_value())
    return bani if bani > 0 and value == value.quantize(Decimal("0.01")) else None


def _valid(day: int, month: int, year: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def readable_dates(text: str) -> set[date]:
    """Every calendar date a `Data donației` cell can mean. A cell of several dates (`23.07; 13.11.2009` lists two), or an ambiguous compact one (`1112019`), yields
    none or several, so no date is set: a cell is read only when its one date explains all of its digits."""
    t = (text or "").strip()
    found: set[date] = set()
    rest = t.lower()
    for pattern, month_of in ((r"(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)", int), (r"(?<!\d)(\d{1,2})\s+([a-zăâîșşțţ]+)\s+(\d{4})(?!\d)", _MONTHS.get)):
        for m in re.finditer(pattern, rest):
            month = month_of(m[2])
            d = _valid(int(m[1]), month, int(m[3])) if month else None
            if d:
                found.add(d)
        rest = re.sub(pattern, " ", rest)
    if re.search(r"\d", rest) and found:  # digits left over: another donation date the cell also lists
        return set()
    if not found and re.fullmatch(r"\d{6,8}", t):  # `18102019`, `4102019`: day, month, year with no separators; a 7-digit cell can read two ways (then no date is set)
        for dl in (1, 2):
            ml = len(t) - 4 - dl
            d = _valid(int(t[:dl]), int(t[dl:dl + ml]), int(t[-4:])) if ml in (1, 2) else None
            if d:
                found.add(d)
    if not found and re.fullmatch(r"\d{5}", t):  # an Excel serial number (`39622`)
        found.add(date(1899, 12, 30) + timedelta(days=int(t)))
    return found


def parse_date(text: str, year: int | None) -> date | None:
    found = readable_dates(text)
    if len(found) != 1:
        return None
    (only,) = found
    return only if year is None or only.year == year else None  # a date outside the row's year is a typo in one of the two: the year is the better-tested field


def read_donations(path: Path, stats: ReadStats | None = None) -> Iterator[Donation]:
    stats = stats if stats is not None else ReadStats()
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        check_header(reader.fieldnames)
        for row in reader:
            stats.rows += 1
            tax = classify_tax_id(row["CUI"])
            if tax.kind != "cui" or not tax.value:
                stats.no_cui += 1
                continue
            kind = KINDS.get((row["Tip donație"] or "").strip())
            if kind is None:
                stats.unknown_kind += 1
                continue
            amount = parse_amount(row["Suma"])
            if amount is None:
                stats.bad_amount += 1
                continue
            year = int(row["An"]) if (row["An"] or "").strip().isdigit() else None
            when = parse_date(row["Data donației"], year)
            stats.firms += 1
            yield Donation(row_id=int(row["rowid"]), cui=tax.value, party=row["Partid"], year=year if year is not None else (when.year if when else None),
                           date=when, date_text=row["Data donației"], amount_bani=amount, kind=kind)
