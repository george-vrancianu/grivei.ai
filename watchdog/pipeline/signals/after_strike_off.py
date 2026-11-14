"""`after-strike-off` (story 53): a Record dated after its supplier's ANAF strike-off.

- Strike-off: ANAF's answer for the CUI (`core.anaf_company`, the latest archived answer) says `RADIERE din data DD.MM.YYYY` in `stare_inregistrare`. Only
  ANAF dates it: ONRC's own "radiata" status is undated (first seen in a snapshot) and is not read here. An ANAF answer that says RADIERE without a date
  never triggers (nothing to compare), and a company ANAF does not know has no strike-off.
- The Record's award date (ADR 0002) must be strictly after the strike-off day: a Record on the day itself is not. Any non-suspect Record counts, whatever
  its value (a blank one included): the Signal is about who was paid or awarded, not how much.
- ANAF's answer is as of the day it was fetched: a firm struck off and later re-registered under the same CUI, or one whose strike-off was later cancelled,
  shows the state ANAF last gave. The merger and the successor of a struck-off firm are other entities (ADR 0003).
- Consortia: a Record triggers when any of its keyed winners was struck off before it.
- Numbers: the `struckOff` date and the `daysAfter` it of the Signal's Record that is furthest after it.
"""
from __future__ import annotations

from datetime import date

from .common import Hit, Row, authority_day_hits
from .reference import strike_off_date, supplier_where, winner_keys

SLUG = "AFTER_STRIKE_OFF"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect"


def load(cur) -> dict[str, date] | None:
    cur.execute("SELECT EXISTS (SELECT 1 FROM core.anaf_company)")
    if not cur.fetchone()[0]:
        return None
    cur.execute(
        """SELECT cui, registration FROM core.anaf_company a
            WHERE a.registration ILIKE '%RADIERE%' AND EXISTS (SELECT 1 FROM seap.search s WHERE s.supplier_key = a.cui)""")
    struck = {cui: strike_off_date(registration) for cui, registration in cur.fetchall()}
    return {cui: day for cui, day in struck.items() if day is not None}


def where(struck: dict[str, date]) -> tuple[str, tuple]:
    return supplier_where(WHERE, struck)


def match(row: Row, struck: dict[str, date]) -> dict | None:
    if row["kind"] not in KINDS or row.get("suspect"):
        return None
    after = [((row["award_date"] - struck[k]).days, struck[k]) for k in winner_keys(row) if k in struck and row["award_date"] > struck[k]]  # type: ignore[operator]
    if not after:
        return None
    days, day = max(after)
    return {"struckOff": day.isoformat(), "daysAfter": days}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return max((n for _, n in members), key=lambda n: (n["daysAfter"], n["struckOff"]))


def detect(rows, struck) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, struck), _combine)
