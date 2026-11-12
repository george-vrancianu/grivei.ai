"""The SEAP direct-purchase (DA) bulk file, as data.gov.ro publishes it, for one file shape.

Real shape (checked on the 2022 T1 file): every text field wrapped in `|...|`, fields separated by commas, the two
value columns bare numbers, dates `MM/DD/YYYY`:

    |NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,
    |COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|

This is the tracer's slice: one shape, strict header validation (a file with missing or unexpected headers, a ragged row
or an unparseable value is rejected whole, so the caller quarantines it), exact duplicate rows dropped. The per-quarter
header alias table, the `|`-inside-fields quirk, XLSX and the other record types belong to the bulk Connector proper.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

# every header spelling we accept -> the canonical column. One table for all quarters for now.
HEADER_ALIASES: dict[str, str] = {
    "NUMAR_ACHIZITIE_DIRECTA": "code",
    "DATA_PUBLICARE_ACHIZITIE": "published_on",
    "STARE_ACHIZITIE": "state",
    "DENUMIRE_AC": "authority_name",
    "CUI_AC": "authority_cui",
    "DENUMIRE_ACHIZITIE": "title",
    "COD_CPV": "cpv_code",
    "DENUMIRE_CPV": "cpv_description",
    "DATA_ATRIBUIRE_ACHIZITIE": "awarded_on",
    "VALOARE_ESTIMATA_RON": "estimated",
    "VALOARE_ATRIBUITA_RON": "value",
    "OFERTANT": "supplier_name",
    "CUI_OFERTANT": "supplier_cui",
}
CANONICAL = frozenset(HEADER_ALIASES.values())


class InvalidFile(Exception):
    """The file failed validation; `problems` says why, for the quarantine reason file."""

    def __init__(self, reason: str, problems: list[str] | None = None):
        super().__init__(reason)
        self.reason = reason
        self.problems = problems or []


@dataclass(frozen=True)
class DirectPurchase:
    code: str
    published_on: date
    awarded_on: date | None
    state: str | None
    authority_name: str
    authority_cui: str | None
    title: str
    cpv_code: str | None
    cpv_description: str | None
    estimated_bani: int | None
    value_bani: int | None
    supplier_name: str | None
    supplier_cui: str | None


def split_row(line: str) -> list[str]:
    """Split one line: `|text|` fields (which may hold commas) and bare fields, separated by commas."""
    fields: list[str] = []
    n, i = len(line), 0
    while True:
        if line.startswith("|", i):
            j = i + 1
            while True:
                j = line.find("|", j)
                if j == -1:
                    raise ValueError("unterminated |field|")
                if j + 1 == n or line[j + 1] == ",":
                    break
                j += 1
            fields.append(line[i + 1 : j])
            i = j + 1
        else:
            j = line.find(",", i)
            j = n if j == -1 else j
            fields.append(line[i:j])
            i = j
        if i >= n:
            return fields
        i += 1  # the comma
        if i == n:
            fields.append("")
            return fields


def _date(text: str) -> date | None:
    text = text.strip()
    if not text:
        return None
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if not m:
        raise ValueError(f"not a MM/DD/YYYY date: {text!r}")
    return date(int(m[3]), int(m[1]), int(m[2]))


def _bani(text: str) -> int | None:
    text = text.strip()
    if not text:
        return None
    try:
        return int((Decimal(text) * 100).quantize(Decimal(1)))
    except InvalidOperation:
        raise ValueError(f"not a number: {text!r}") from None


def normalise_cui(text: str) -> str | None:
    """Digits of a Romanian tax code without the `RO` prefix; None when nothing usable is left."""
    digits = re.sub(r"^RO\s*", "", text.strip(), flags=re.IGNORECASE)
    digits = re.sub(r"\s+", "", digits)
    return digits or None


def parse_da_file(path: Path) -> list[DirectPurchase]:
    """Parse and validate one DA file. Raises InvalidFile; never returns a partial result."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as e:
        raise InvalidFile("not UTF-8 text", [str(e)]) from None
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise InvalidFile("empty file")
    try:
        header = split_row(lines[0])
    except ValueError as e:
        raise InvalidFile("unreadable header line", [str(e)]) from None
    columns = [HEADER_ALIASES.get(h.strip()) for h in header]
    unexpected = [h for h, c in zip(header, columns) if c is None]
    missing = sorted(CANONICAL - {c for c in columns if c})
    if unexpected or missing or len(set(columns)) != len(columns):
        raise InvalidFile(
            "headers do not match a direct-purchase (DA) file",
            [f"missing: {', '.join(missing)}" if missing else "", f"unexpected: {', '.join(unexpected)}" if unexpected else ""],
        )

    seen: set[str] = set()
    rows: dict[str, DirectPurchase] = {}
    for number, line in enumerate(lines[1:], start=2):
        if line in seen:  # an exact duplicate row
            continue
        seen.add(line)
        try:
            fields = split_row(line)
            if len(fields) != len(columns):
                raise ValueError(f"{len(fields)} fields, expected {len(columns)}")
            f = dict(zip(columns, (v.strip() for v in fields)))
            published = _date(f["published_on"])
            if not f["code"] or published is None:
                raise ValueError("no public code or publication date")
            record = DirectPurchase(
                code=f["code"],
                published_on=published,
                awarded_on=_date(f["awarded_on"]),
                state=f["state"] or None,
                authority_name=f["authority_name"],
                authority_cui=normalise_cui(f["authority_cui"]),
                title=f["title"],
                cpv_code=f["cpv_code"] or None,
                cpv_description=f["cpv_description"] or None,
                estimated_bani=_bani(f["estimated"]),
                value_bani=_bani(f["value"]),
                supplier_name=f["supplier_name"] or None,
                supplier_cui=normalise_cui(f["supplier_cui"]),
            )
        except ValueError as e:
            raise InvalidFile(f"line {number}: {e}", [f"line {number}: {e}"]) from None
        # a code repeated with different content: the later row wins (the real rule is the bulk Connector's to settle)
        rows[record.code] = record
    return list(rows.values())
