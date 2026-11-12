"""`over-cap` (story 70): a direct purchase above the statutory cap for its date and type, and below 10 times it.

- DA and DAN only; the cap is `counting.CAPS` by award date (the change of 10 September 2022: the boundary day is in the new era) and
  type (works by `Tip contract` or CPV division 45): the one table in counting.py, never a copy.
- Strictly above the cap: a value exactly at the cap is within the law. 10 times the cap or more is a suspect value (counting.py) and
  never triggers: the rule is the band between, so a data-entry error does not make a Signal.
- CPV division 70 (rents) and the other `EXEMPT_CPV_DIVISIONS` are exempt. A blank or zero value has nothing to compare.
- Numbers: `value`, `cap` (bani) and `multiple` (value / cap). A Signal of several Records the same day shows its largest one.
"""
from __future__ import annotations

from ..counting import EXEMPT_CPV_DIVISIONS, SUSPECT_CAP_MULTIPLE, cap_for, is_works
from .common import Hit, Row, authority_day_hits

SLUG = "OVER_CAP"
KINDS = ("DA", "DAN")
WHERE = "kind IN ('DA', 'DAN') AND NOT suspect AND value_bani IS NOT NULL"


def match(row: Row) -> dict | None:
    """The Record's own numbers when it is over the cap and below 10 times it, else None."""
    value = row.get("value_bani")
    if row["kind"] not in KINDS or row.get("suspect") or value is None:
        return None
    cpv = str(row.get("cpv_code") or "").strip()
    if cpv[:2] in EXEMPT_CPV_DIVISIONS:
        return None
    cap = cap_for(row["award_date"], is_works(row.get("contract_type"), cpv))  # type: ignore[arg-type]
    if not cap < int(value) < SUSPECT_CAP_MULTIPLE * cap:  # type: ignore[call-overload]
        return None
    return {"value": str(value), "cap": str(cap), "multiple": round(int(value) / cap, 6)}  # type: ignore[call-overload]


def _combine(members: list[tuple[Row, dict]]) -> dict:
    return max((n for _, n in members), key=lambda n: (int(n["value"]), n["multiple"]))


def detect(rows) -> list[Hit]:
    return authority_day_hits(SLUG, rows, match, _combine)
