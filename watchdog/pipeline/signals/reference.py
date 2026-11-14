"""What the Signal rules that read a Reference source share (#184): the thresholds of #127 and #173 in one place, and the small readers over the
tables ONRC, ANAF and the financial statements leave in the graph.

A Reference source is context. Only a Record that meets a rule's thresholds is a Signal; the facts read here (a registration date, an authorised CAEN
code, a status, an employee count, an annual award total) never are one on their own (ADR 0014).

Entity keys of CUI-identified suppliers are their CUI (`core.entity.key`), and ONRC's `registration.cui`, ANAF's `anaf_company.cui` and the statements'
`cui` are the same normalised string, so every join below is on the key.
"""
from __future__ import annotations

import re
from datetime import date

from ..counting import RON, fold

MILLION_RON = 1_000_000 * RON  # in bani
FIVE_MILLION_RON = 5_000_000 * RON

# Where a Record's winners are read from: its keyed, non-natural winners (a natural person has no key). Same reading as `common.supplier_keys`.


def winner_keys(row) -> list[str]:
    return [w["key"] for w in row.get("winners") or () if w.get("key") and not w.get("naturalPerson")]


def months_before(day: date, months: int) -> date:
    """`day` minus `months` calendar months, the day clamped to the month's length (31 August minus 6 months is 28 February)."""
    index = day.year * 12 + day.month - 1 - months
    year, month = divmod(index, 12)
    month += 1
    for d in (day.day, 30, 29, 28):
        try:
            return date(year, month, d)
        except ValueError:
            continue
    raise AssertionError("unreachable")  # pragma: no cover


_STRIKE_OFF = re.compile(r"RADIERE\s+DIN\s+DATA\s+(\d{1,2})\.(\d{1,2})\.(\d{4})", re.IGNORECASE)


def strike_off_date(registration: str | None) -> date | None:
    """The day ANAF's `stare_inregistrare` ("RADIERE din data 11.10.2022") says the company was struck off, or None when it carries no such date."""
    found = _STRIKE_OFF.search(registration or "")
    if not found:
        return None
    day, month, year = (int(g) for g in found.groups())
    try:
        return date(year, month, day)
    except ValueError:
        return None


# Construction is division 41 to 43 of CAEN Rev.2 (2008) and of Rev.3 (2025, NACE Rev.2.1); ONRC's `onrc.caen.version` tells which revision a code is in
# (0 = 1998, 1 = 2003, 2 = 2008, 3 = 2025). CAEN 1998 and 2003 (Rev.1) put construction in division 45. A code with no version is read as Rev.2 or Rev.3.
def is_construction_caen(code: str, version: int | None) -> bool:
    digits = re.sub(r"\D", "", code or "")[:2]
    if version in (0, 1):
        return digits == "45"
    return digits in ("41", "42", "43")


# ONRC's FORMA_JURIDICA, in full or as the abbreviation: an SRL (including the "debutant" and "unipersonala" variants, which start with the same words)
# or an SA ("societate pe actiuni"; the "societate in comandita pe actiuni" is another form and does not start with these words).
_SRL = re.compile(r"^(SRL|S R L|SOCIETATE( COMERCIALA)? CU RASPUNDERE LIMITATA)\b")
_SA = re.compile(r"^(SA|S A|SOCIETATE( COMERCIALA)? PE ACTIUNI)\b")


def company_form(legal_form: str | None) -> str | None:
    """'SRL' or 'SA' for an SRL or an SA, else None (also None for a blank legal form: unknown is never a non-filer)."""
    text = " ".join(fold(legal_form).replace(".", " ").upper().split())
    if _SRL.match(text):
        return "SRL"
    if _SA.match(text):
        return "SA"
    return None
