"""Reads one archived AMEPIP file (`.xlsx`, `.xls` or `.csv`) into one row per CUI.

The real file (January 2026) is a workbook with one row per company and year; every sheet that has a `cui` and a name column (`company`, `name`
or `denumire`) counts, and a CUI seen in several sheets or years is one enterprise: its name, registration number and status are the newest
year's, and its first and last year are the extremes of the `an` / `year` column. A file with no such sheet is an `AmepipError`.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path

from ..mf.build import normalise_cui
from ..placement.matching import fold


class AmepipError(Exception):
    pass


@dataclass(frozen=True)
class AmepipEnterprise:
    cui: str  # normalised like an entity key: no RO, no leading zeros
    name: str  # as AMEPIP writes it
    registration_number: str | None  # ONRC's J-number as AMEPIP writes it
    status: str | None  # ONRC status as AMEPIP writes it, from the newest year (Romanian, source data)
    first_year: int | None
    last_year: int | None


_NAME_COLUMNS = ("company", "name", "denumire")
_YEAR_COLUMNS = ("an", "year")


def _tables(path: Path) -> list[list[list]]:
    """Every sheet (or the one CSV table) as a list of rows."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as f:
            return [list(csv.reader(f))]
    if suffix == ".xlsx":
        from openpyxl import load_workbook

        wb = load_workbook(path, read_only=True, data_only=True)
        return [[list(row) for row in ws.iter_rows(values_only=True)] for ws in wb.worksheets]
    import xlrd  # a legacy .xls

    book = xlrd.open_workbook(str(path))
    return [[sheet.row_values(r) for r in range(sheet.nrows)] for sheet in book.sheets()]


def _year(value: object) -> int | None:
    m = re.match(r"\s*(\d{4})", str(value if value is not None else ""))
    return int(m[1]) if m else None


def read_list(path: Path) -> list[AmepipEnterprise]:
    found: dict[str, dict] = {}
    any_table = False
    for rows in _tables(path):
        if not rows:
            continue
        header = [fold(str(c)).strip().lower().replace(" ", "_") if c is not None else "" for c in rows[0]]
        if "cui" not in header or not any(n in header for n in _NAME_COLUMNS):
            continue
        any_table = True
        col = {n: header.index(n) for n in ("cui", "registration_number", "status", *_NAME_COLUMNS, *_YEAR_COLUMNS) if n in header}
        name_col = next(col[n] for n in _NAME_COLUMNS if n in col)
        year_col = next((col[n] for n in _YEAR_COLUMNS if n in col), None)

        def cell(row, index):
            text = "" if index is None or index >= len(row) or row[index] is None else str(row[index]).strip()
            return text or None

        for row in rows[1:]:
            cui = normalise_cui(row[col["cui"]] if col["cui"] < len(row) else "")
            if not cui:
                continue
            year = _year(row[year_col]) if year_col is not None and year_col < len(row) else None
            e = found.setdefault(cui, {"year": None, "first": None, "last": None, "name": None, "reg": None, "status": None})
            e["first"] = year if e["first"] is None or (year is not None and year < e["first"]) else e["first"]
            if year is not None and (e["last"] is None or year > e["last"]):
                e["last"] = year
            # the newest year wins for name, registration number and status; a row with no year only fills what is still empty
            newest = year is not None and (e["year"] is None or year >= e["year"])
            for key, value in (("name", cell(row, name_col)), ("reg", cell(row, col.get("registration_number"))), ("status", cell(row, col.get("status")))):
                if value and (newest or e[key] is None):
                    e[key] = value
            if newest:
                e["year"] = year
    if not any_table:
        raise AmepipError(f"{path.name}: no table with a cui column and a company name column")
    return [AmepipEnterprise(cui, e["name"] or "", e["reg"], e["status"], e["first"], e["last"]) for cui, e in sorted(found.items(), key=lambda kv: int(kv[0]))]
