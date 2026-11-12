"""`splitting` (story 71): the same purchase cut into pieces that each stay under the cap, which together are over it.

- Two or more direct purchases (DA and DAN) from one authority to one supplier in one CPV group (the first three digits of the CPV code)
  whose award dates fall within 30 days of each other, each at or under the cap and together above the cap in force on the last
  purchase's date. "Within 30 days" = the first and the last purchase are at most 30 calendar days apart counting both days: last date
  minus first date <= 29. Two purchases 31 days apart (difference 30) are outside the window.
- The cap is `counting.CAPS` by date and type (works by `Tip contract` or CPV division 45): the one table in counting.py, never a copy.
  Each purchase is compared to the cap of its own date and type ("each at or under the cap"; a purchase above it is over-cap's, not a
  member). The sum is compared to the cap of the LAST purchase's date and type (a window across 10 September 2022 uses the new cap).
- Left out of the rule altogether (they neither trigger nor count): a suspect value, a blank or zero value, CPV division 70 (rents) and the
  other `EXEMPT_CPV_DIVISIONS`, a Record with no authority, no CPV group or no supplier to name (a natural person), and a consortium Record
  (several winners): see "Members" below.
- Windows: for every award date d of a (authority, supplier, CPV group), the purchases dated d-29 .. d form a window; it qualifies when
  it has two or more purchases and they add up to more than the cap. Windows whose date ranges overlap (they share a day, so a Record)
  merge into ONE Signal from the first to the last date. Two qualifying windows that do not overlap are two Signals.
- Members: the purchases of the merged windows. Every eligible purchase between the Signal's first and last date is in one of its
  windows (the windows cover the range), so the Signal is a date range of the triple.
- Exactness of `reproduce` (`authority`, `signal`, `supplier`, `cpv` = the group, `from`, `to`): the search rows of a Record carry the rule
  slug only when the Record is a member, so the filter returns the members and nothing else of the triple in the range. It stays exact
  because a Signal has ONE supplier: a consortium Record (one row per winner in the search) would also match the filter of a co-winner
  who is not the Signal's supplier, so consortium Records are left out of the rule (documented trade-off; the Signal never splits a
  consortium's shares). Two Signals of one triple are disjoint in dates, so `from` / `to` tell them apart.
- Numbers: `purchases`, `sum` (bani, the awarded values), `cap` (the cap in force on the last purchase's date), `cpvGroup`, `from`, `to`.
"""
from __future__ import annotations

from datetime import date, timedelta

from ..counting import EXEMPT_CPV_DIVISIONS, cap_for, is_works
from .common import Hit, Row

SLUG = "SPLITTING"
KINDS = ("DA", "DAN")
WINDOW_DAYS = 30  # first and last purchase at most this many days apart, both days counted
WHERE = ("kind IN ('DA', 'DAN') AND NOT suspect AND value_bani IS NOT NULL AND authority_key IS NOT NULL "
         "AND cpv_code ~ '^\\s*[0-9]{3}' AND jsonb_array_length(winners) = 1")


def cpv_group(cpv: object) -> str | None:
    """The first three digits of the CPV code, or None when there are not three."""
    head = str(cpv or "").strip()[:3]
    return head if len(head) == 3 and head.isdigit() else None


def supplier_of(row: Row) -> str | None:
    """The one winner's entity key; None for a consortium, a natural person or a winner with no key."""
    winners = row.get("winners") or ()
    if len(winners) != 1 or winners[0].get("naturalPerson") or not winners[0].get("key"):  # type: ignore[union-attr]
        return None
    return str(winners[0]["key"])  # type: ignore[index]


def _works(row: Row) -> bool:
    return is_works(row.get("contract_type"), row.get("cpv_code"))  # type: ignore[arg-type]


def eligible(row: Row) -> tuple[str, str, str] | None:
    """(authority, supplier, CPV group) when the Record can be a member: a DA or DAN, not suspect, with a value at or under its own cap."""
    value = row.get("value_bani")
    authority, supplier, group = row.get("authority_key"), supplier_of(row), cpv_group(row.get("cpv_code"))
    if row["kind"] not in KINDS or row.get("suspect") or not value or int(value) <= 0 or not authority or not supplier or not group:  # type: ignore[call-overload]
        return None
    if group[:2] in EXEMPT_CPV_DIVISIONS:
        return None
    if int(value) > cap_for(row["award_date"], _works(row)):  # type: ignore[arg-type,call-overload]
        return None  # above its cap: over-cap's Record, not a member
    return str(authority), supplier, group


def _signals_of(rows: list[Row]) -> list[tuple[int, int]]:
    """The merged qualifying windows of one triple's purchases (sorted by date, then code), as inclusive index ranges."""
    windows: list[tuple[int, int]] = []
    start, total = 0, 0
    for end, last in enumerate(rows):
        total += int(last["value_bani"])  # type: ignore[call-overload]
        day: date = last["award_date"]  # type: ignore[assignment]
        if end + 1 < len(rows) and rows[end + 1]["award_date"] == day:
            continue  # a window ends on a day, not between two purchases of it
        while (day - rows[start]["award_date"]) > timedelta(days=WINDOW_DAYS - 1):  # type: ignore[operator]
            total -= int(rows[start]["value_bani"])  # type: ignore[call-overload]
            start += 1
        if end > start and total > cap_for(day, _works(last)):
            first_day = rows[start]["award_date"]
            if windows and first_day <= rows[windows[-1][1]]["award_date"]:  # overlaps the previous window: one Signal
                windows[-1] = (windows[-1][0], end)
            else:
                windows.append((start, end))
    return windows


def detect(rows) -> list[Hit]:
    groups: dict[tuple[str, str, str], list[Row]] = {}
    for row in rows:
        triple = eligible(row)
        if triple is not None:
            groups.setdefault(triple, []).append(row)
    hits = []
    for (authority, supplier, group), purchases in groups.items():
        purchases.sort(key=lambda r: (r["award_date"], str(r["code"])))  # type: ignore[arg-type,return-value]
        for first, last in _signals_of(purchases):
            members = purchases[first:last + 1]
            start, end = members[0]["award_date"], members[-1]["award_date"]
            cap = cap_for(end, _works(members[-1]))  # type: ignore[arg-type]
            total = sum(int(r["value_bani"]) for r in members)  # type: ignore[call-overload]
            hits.append(Hit(
                rule=SLUG, authority_key=authority, first_date=start, date=end, record_codes=tuple(str(r["code"]) for r in members),
                value_bani=sum(int(r["counted_bani"] or 0) for r in members), supplier_keys=(supplier,),
                numbers={"purchases": len(members), "sum": str(total), "cap": str(cap), "cpvGroup": group, "from": start.isoformat(), "to": end.isoformat()},
                reproduce={"authority": authority, "signal": SLUG, "supplier": supplier, "cpv": group, "from": start.isoformat(), "to": end.isoformat()},
            ))
    return hits
