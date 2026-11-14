"""Readers of one archived ONRC snapshot (never the network). Both layouts the fetch half documents (`fetch.py`) come out as the same rows.

The files are UTF-8 (with a BOM), `^`-separated, with no quoting (a company name can hold a `"`), one header row. ONRC publishes no CNP, so
there is no field to strip. A row without a registration number is dropped: it cannot be joined to anything.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass
import posixpath
from datetime import date, datetime
from pathlib import Path
from typing import Iterator
from urllib.parse import unquote, urlparse

from ..archive import Unit
from ..identity import comma_below, cui_check_digit_ok

csv.field_size_limit(1 << 24)

# the state code the register uses for a company that is struck off; the strike-off is dated like any other status, by snapshot comparison
STRUCK_OFF = 1084


class OnrcReadError(Exception):
    pass


@dataclass(frozen=True)
class Company:
    """One registration as one snapshot lists it."""
    reg_no: str  # COD_INMATRICULARE, e.g. `J40/1234/2010`
    cui: str | None  # normalised, only when it passes the CUI check digit (ADR 0018); None for `0`, blank or an invalid number
    name: str
    registration_date: date | None  # `current` layout only
    legal_form: str | None
    euid: str | None
    county: str | None  # ADR_JUDET as published
    locality: str | None
    address: str | None  # one line, as published (legacy: ADRESA, current: built from the ADR_ columns)
    postal_code: str | None
    states: tuple[int, ...]  # the status codes, legacy layout only (the current layout lists them in OD_STARE_FIRMA)


def rows_of(path: Path, delimiter: str = "^") -> Iterator[dict[str, str]]:
    """The rows of one CSV as dicts keyed by the header (upper-cased, stripped); short rows are padded, long ones cut."""
    with path.open(encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.reader(f, delimiter=delimiter, quoting=csv.QUOTE_NONE)
        header = [h.strip().upper() for h in next(reader, [])]
        if not header:
            raise OnrcReadError(f"{path.name}: empty file")
        width = len(header)
        for row in reader:
            if not row:
                continue
            if len(row) < width:
                row = row + [""] * (width - len(row))
            yield dict(zip(header, (c.strip() for c in row[:width])))


def normalise_cui(raw: str | None) -> str | None:
    """`'0'`, blank, a number with a bad check digit -> None; else the digits without leading zeros."""
    digits = re.sub(r"\D", "", raw or "").lstrip("0")
    return digits if digits and cui_check_digit_ok(digits) else None


def parse_date(text: str | None) -> date | None:
    try:
        return datetime.strptime((text or "").strip(), "%d/%m/%Y").date()
    except ValueError:
        return None


def _county(value: str | None) -> str | None:
    return value or None


def _current_address(row: dict[str, str]) -> str | None:
    parts = [row.get("ADR_LOCALITATE", ""), f"Str. {row['ADR_DEN_STRADA']}" if row.get("ADR_DEN_STRADA") else "", f"Nr. {row['ADR_NR_STRADA']}" if row.get("ADR_NR_STRADA") else "",
             f"Bl. {row['ADR_BLOC']}" if row.get("ADR_BLOC") else "", f"Sc. {row['ADR_SCARA']}" if row.get("ADR_SCARA") else "",
             f"Et. {row['ADR_ETAJ']}" if row.get("ADR_ETAJ") else "", f"Ap. {row['ADR_APARTAMENT']}" if row.get("ADR_APARTAMENT") else "", row.get("ADR_COMPLETARE", "")]
    line = ", ".join(p for p in parts if p)
    postal = row.get("ADR_COD_POSTAL", "").strip()
    return (line + (f", Cod postal {postal}" if postal else "")) or None


def _company(row: dict[str, str], *, states: tuple[int, ...] = (), current: bool) -> Company | None:
    reg_no = row.get("COD_INMATRICULARE", "")
    if not reg_no:
        return None
    return Company(
        reg_no=reg_no, cui=normalise_cui(row.get("CUI")), name=row.get("DENUMIRE", ""),
        registration_date=parse_date(row.get("DATA_INMATRICULARE")) if current else None,
        legal_form=row.get("FORMA_JURIDICA") or None, euid=row.get("EUID") or None,
        county=_county(row.get("ADR_JUDET")), locality=row.get("ADR_LOCALITATE") or None,
        address=_current_address(row) if current else (row.get("ADRESA_COMPLETA") or row.get("ADRESA") or None),
        postal_code=row.get("ADR_COD_POSTAL") or None, states=states)


def _codes(text: str) -> tuple[int, ...]:
    return tuple(sorted({int(c) for c in re.findall(r"\d+", text or "")}))


def layout_of(unit: Unit) -> str:
    return (unit.origin or {}).get("layout") or ("current" if any(f.lower() == "od_firme.csv" for f in unit.files) else "legacy")


def _files(unit: Unit, role: str) -> list[Path]:
    """The unit's files of a role, by the resource identity in the manifest (the role is recorded there)."""
    out = []
    for res in (unit.origin or {}).get("resources") or []:
        if res.get("role") == role:
            name = _name_of(unit, res)
            if name:
                out.append(unit.file_path(name))
    return out


def _name_of(unit: Unit, resource: dict) -> str | None:
    """The archived file of a resource: the URL's file name, or the same with the resource id's first 8 characters in front (`fetch._file_name`)."""
    base = posixpath.basename(unquote(urlparse(resource.get("url") or "").path))
    for candidate in (base, f"{(resource.get('resourceId') or '')[:8]}-{base}"):
        if candidate in unit.files:
            return candidate
    return None


def read_companies(unit: Unit) -> Iterator[Company]:
    """Every registration of a snapshot, with its status codes in `states` (both layouts)."""
    if layout_of(unit) == "current":
        firme, stare = _files(unit, "firme"), _files(unit, "stare")
        if not firme or not stare:
            raise OnrcReadError(f"{unit.path}: a `current` snapshot needs OD_FIRME and OD_STARE_FIRMA")
        by_reg: dict[str, set[int]] = {}
        for row in rows_of(stare[0]):
            if row.get("COD_INMATRICULARE") and (row.get("COD") or "").isdigit():
                by_reg.setdefault(row["COD_INMATRICULARE"], set()).add(int(row["COD"]))
        for row in rows_of(firme[0]):
            if company := _company(row, states=tuple(sorted(by_reg.get(row.get("COD_INMATRICULARE", ""), ()))), current=True):
                yield company
    else:
        files = _files(unit, "legacy")
        if not files:
            raise OnrcReadError(f"{unit.path}: no company files")
        for path in files:
            for row in rows_of(path):
                if company := _company(row, states=_codes(row.get("STARE_FIRMA", "")), current=False):
                    yield company


def read_caen(unit: Unit) -> Iterator[tuple[str, str, int | None]]:
    """(registration number, CAEN code, CAEN version) of the authorised activities; the legacy layout has none."""
    for path in _files(unit, "caen"):
        for row in rows_of(path):
            if row.get("COD_INMATRICULARE") and row.get("COD_CAEN_AUTORIZAT"):
                version = row.get("VER_CAEN_AUTORIZAT") or ""
                yield row["COD_INMATRICULARE"], row["COD_CAEN_AUTORIZAT"], int(version) if version.isdigit() else None


def read_status_names(unit: Unit) -> dict[int, str]:
    """The status code -> name nomenclature of the snapshot (`^`-separated in the current files, `|` in the legacy one, which is not UTF-8)."""
    names: dict[int, str] = {}
    for path in _files(unit, "nomenclature"):
        with path.open("rb") as f:
            head = f.readline().decode("utf-8-sig", errors="replace")
        delimiter = "|" if "|" in head and "^" not in head else "^"
        for row in rows_of(path, delimiter):
            if (row.get("COD") or "").isdigit() and row.get("DENUMIRE"):
                names[int(row["COD"])] = row["DENUMIRE"]
    return names


def display_name(name: str) -> str:
    """ONRC writes cedilla letters in places; the display form is comma-below, as for ANAF (ADR 0003)."""
    return comma_below(name)
