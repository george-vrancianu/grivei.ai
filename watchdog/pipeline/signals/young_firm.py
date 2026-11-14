"""`young-firm` (story 51): a supplier whose first Record comes within 90 days of its registration, or that wins one of at least 1M RON within 180 days.

- Registration date: ONRC's `DATA_INMATRICULARE` of the supplier's primary registration (`onrc.registration`, the newest snapshot). The legacy layout
  (before mid-2025) has no registration date; a supplier with none is never in this Signal, and the rule is absent (no methodology row) when no registration
  date is loaded at all. The registration date is the firm's own: a company that re-registered, or moved its seat, can look older than it is, and a
  re-registration number can make it look younger.
- First contract: the supplier's earliest award DAY among its non-suspect Records in the graph. Every Record dated that day is a first Record (two
  authorities, or a contract and its award notice, on the same day are all the first contract): it is a Signal if it is on or after the registration and
  at most 90 days after it. Every Record of such a supplier on a later day within 90 days is context and never a Signal on its own (acceptance of #184).
- Large Record: any non-suspect Record whose counted value is at least 1M RON (exactly 1M RON counts; a blank value counts as nothing) and that is dated on
  or after the registration and at most 180 days after it, whether or not it is the first.
- Both are counted from the day of registration to the Record's award date (ADR 0002: the publication date stands in when there is none). A Record dated
  before the registration (a data error, or a registration number that was reissued) never triggers. Days are calendar days; day 90 and day 180 are in.
- Consortia: a Record triggers when any of its keyed winners meets the rule; every winner of the Record is named in the Signal.
- Numbers: the earliest `days` among the Records of the Signal, that supplier's `registered` date and the Record's `counted` value (null for a blank one).
"""
from __future__ import annotations

from datetime import date

from .common import Hit, Row, authority_day_hits
from .reference import MILLION_RON, supplier_where, winner_keys

SLUG = "YOUNG_FIRM"
KINDS = ("DA", "DAN", "CONTRACT", "AWARD_NOTICE")
WHERE = "NOT suspect"
FIRST_CONTRACT_DAYS = 90
LARGE_RECORD_DAYS = 180
LARGE_RECORD_BANI = MILLION_RON


class Context:
    """`registered`: CUI -> registration date, for the suppliers with a Record inside the long window; `first`: CUI -> the award date of the supplier's first Record (every Record of that day is a first one)."""

    def __init__(self, registered: dict[str, date], first: dict[str, date]):
        self.registered, self.first = registered, first


def load(cur) -> Context | None:
    cur.execute("SELECT EXISTS (SELECT 1 FROM onrc.registration WHERE registration_date IS NOT NULL)")
    if not cur.fetchone()[0]:
        return None
    # set-based on purpose: seap.search has no supplier index yet (the record indexes are built after the Signals), so no per-supplier probes
    cur.execute(
        """SELECT DISTINCT r.cui, r.registration_date
             FROM onrc.registration r JOIN seap.search s ON s.supplier_key = r.cui
            WHERE r.primary_for_cui AND r.registration_date IS NOT NULL AND NOT s.suspect AND s.award_date - r.registration_date BETWEEN 0 AND %s""", (LARGE_RECORD_DAYS,))
    registered = dict(cur.fetchall())
    cur.execute(
        """SELECT supplier_key, min(award_date) FROM seap.search
            WHERE supplier_key = ANY(%s) AND NOT suspect GROUP BY supplier_key""", (sorted(registered),))
    return Context(registered, dict(cur.fetchall()))


def where(context: Context) -> tuple[str, tuple]:
    return supplier_where(WHERE, context.registered)


def match(row: Row, context: Context) -> dict | None:
    if row["kind"] not in KINDS or row.get("suspect"):
        return None
    counted = row.get("counted_bani")
    best: tuple[int, date] | None = None
    for key in winner_keys(row):
        registered = context.registered.get(key)
        if registered is None:
            continue
        days = (row["award_date"] - registered).days  # type: ignore[operator]
        first = context.first.get(key) == row["award_date"] and 0 <= days <= FIRST_CONTRACT_DAYS
        large = counted is not None and int(counted) >= LARGE_RECORD_BANI and 0 <= days <= LARGE_RECORD_DAYS  # type: ignore[call-overload]
        if (first or large) and (best is None or (days, registered) < best):
            best = (days, registered)
    if best is None:
        return None
    return {"days": best[0], "registered": best[1].isoformat(), "counted": None if counted is None else str(counted)}


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return min((n for _, n in members), key=lambda n: (n["days"], n["registered"]))


def detect(rows, context: Context) -> list[Hit]:
    return authority_day_hits(SLUG, rows, lambda row: match(row, context), _combine)
