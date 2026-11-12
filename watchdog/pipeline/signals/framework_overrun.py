"""`framework-overrun` (story 72): the subsequent contracts a framework agreement reports add up to more than 110% of its ceiling.

- A framework is an award notice (the counting rule's link, `notice_code`; `seap.framework` is one row per such notice). The rule reads the
  stored columns of the notice's Records, it never re-derives the counting rule: ceiling = sum of the non-suspect `ceiling_bani` of the
  notice's CEILING Records (the same sum as `rebuild._FRAMEWORKS`), subsequent = sum of the `counted_bani` of its SUBSEQUENT Records.
  The sums are made here from the rows already streamed (the members come from the same rows) instead of reading `seap.framework`; the
  seam 1 test checks they equal `seap.framework`'s ratio.
- Only frameworks awarded from 2021: the framework's award date is the earliest award date (ADR 0002 fallback already in `award_date`) of
  its ceiling Records, and it must be on or after 2021-01-01. A pre-2021 framework never triggers, whatever its call-offs' dates.
- A blank ceiling never triggers: no CEILING Record with a non-suspect value (a null or suspect value, or no CEILING Record loaded for the
  notice) means no ceiling. A suspect value, ceiling or subsequent, is left out of the sums and of the members.
- Threshold: strictly more than 110% (exactly 110% is no Signal), in integer bani: `running * 10 > ceiling * 11`, no floats.
- Crossing: the subsequent contracts in award-date then code order; the first whose running sum is above 110% is the crossing call-off.
  The Signal is dated by it (its `date` = the latest of its members' award dates, which is the crossing call-off's unless a ceiling
  Record is dated later: ADR 0002, a Signal is dated by its latest Record); `firstDate` = the framework's award date.
- Members: the notice's non-suspect ceiling Records and its counted subsequent contracts up to and including the crossing call-off.
  Call-offs after the crossing are not members (the Signal is a snapshot of the moment it crossed), but `numbers` describe the framework
  as reported to the data-through date, as the Record page and `seap.framework` do: `ceiling`, `subsequent` (every counted call-off
  reported) and `ratio` = subsequent / ceiling. Reader-facing consequence: the Records listed under a Signal can add up to less than
  `numbers.subsequent`; the rest are on the framework's own page.
- Authority: the authority of the notice's lowest-code ceiling Record. A notice has one authority in the files; if one were ever to
  hold Records of several, only the Records of that authority are read (so the Signal's `reproduce` stays a single-authority filter).
- One Signal per framework (notice); nothing is merged across frameworks. Suppliers are every winner of the members, natural persons left out.
- Exactness of `reproduce` (`authority`, `signal`, [`supplier`], [`cpv`], `from`, `to`): there is no notice key in `RecordFilter`, so the
  filter is made as narrow as the existing keys allow: `supplier` only when every member has exactly that one keyed winner, `cpv` = the
  longest common prefix of the members' CPV codes (none when they share none), `from` / `to` = the first and last member dates. Only
  members carry the slug on their search rows, so the filter returns exactly the members unless ANOTHER framework-overrun Signal of the
  same authority has a member that also matches it (the same authority, a date inside the range, a common CPV prefix, the same
  supplier). `detect` finds those collisions; on one it still emits both Signals (the data is right, the filter is not exact) and logs a
  warning naming them. A contract follow-up (a `notice` filter key) would remove the residual inexactness.
- Window: starts 2021-01-01 (`WINDOW_FROM`, the one generic addition in signals/__init__.py: a rule may floor its window) even if a
  2020 Contracte file is loaded, because only 2021+ frameworks are read. Base rate and data-through are the generic ones.
- Memory: the rule declares `ORDER_BY` (notice, award date, code), so `detect` holds one notice's Records at a time, plus the (small)
  list of the Signals found, which the collision check needs.
"""
from __future__ import annotations

import logging
from datetime import date
from itertools import groupby
from os.path import commonprefix
from typing import Iterable, Iterator, NamedTuple

from .common import Hit, Row, supplier_keys

log = logging.getLogger(__name__)

SLUG = "FRAMEWORK_OVERRUN"
KINDS = ("CONTRACT",)  # Contracte rows carry `Incheiat prin` and share the framework's award notice (the base rate's population)
FROM = date(2021, 1, 1)  # frameworks awarded on or after this day
WINDOW_FROM = FROM  # the rule's window never starts before it, even when a 2020 Contracte file is loaded (signals/__init__.py)
WHERE = "framework_role IS NOT NULL AND notice_code IS NOT NULL"
ORDER_BY = "notice_code, award_date, code"


class Member(NamedTuple):
    """What a Signal's filter is matched against: the Record's code, award date, CPV code and winner keys."""

    code: str
    day: date
    cpv: str
    suppliers: frozenset[str]


def _bani(row: Row, column: str) -> int:
    return int(row.get(column) or 0)  # type: ignore[call-overload]


def _member(row: Row) -> Member:
    return Member(str(row["code"]), row["award_date"], str(row.get("cpv_code") or "").strip(), frozenset(supplier_keys([row])))  # type: ignore[arg-type]


def _reproduce(authority: str, rows: list[Row]) -> dict:
    """The narrowest `RecordFilterValue` the existing keys allow (see the module docstring)."""
    days = [r["award_date"] for r in rows]
    filt: dict = {"authority": authority, "signal": SLUG}
    keyed = [{w["key"] for w in r.get("winners") or () if w.get("key") and not w.get("naturalPerson")} for r in rows]
    everyone = [len(r.get("winners") or ()) for r in rows]
    if all(len(k) == 1 and n == 1 for k, n in zip(keyed, everyone)) and len(set().union(*keyed)) == 1:
        filt["supplier"] = next(iter(keyed[0]))
    prefix = commonprefix([str(r.get("cpv_code") or "").strip() for r in rows])
    if prefix:
        filt["cpv"] = prefix
    filt["from"], filt["to"] = min(days).isoformat(), max(days).isoformat()  # type: ignore[type-var]
    return filt


def _framework(notice: Iterable[Row]) -> tuple[Hit, list[Member]] | None:
    rows = list(notice)
    ceilings = sorted((r for r in rows if r.get("framework_role") == "CEILING" and not r.get("suspect") and _bani(r, "ceiling_bani") > 0), key=lambda r: str(r["code"]))
    if not ceilings or not ceilings[0].get("authority_key"):
        return None  # a blank ceiling (or no authority to name) never triggers
    authority = str(ceilings[0]["authority_key"])
    ceilings = [r for r in ceilings if r.get("authority_key") == authority]
    first = min(r["award_date"] for r in ceilings)  # type: ignore[type-var]
    if first < FROM:
        return None
    ceiling = sum(_bani(r, "ceiling_bani") for r in ceilings)
    offs = sorted((r for r in rows if r.get("framework_role") == "SUBSEQUENT" and not r.get("suspect") and _bani(r, "counted_bani") > 0 and r.get("authority_key") == authority),
                  key=lambda r: (r["award_date"], str(r["code"])))  # type: ignore[arg-type,return-value]
    total, running, crossing = sum(_bani(r, "counted_bani") for r in offs), 0, None
    for n, r in enumerate(offs):
        running += _bani(r, "counted_bani")
        if running * 10 > ceiling * 11:
            crossing = n
            break
    if crossing is None:
        return None
    members = sorted([*ceilings, *offs[:crossing + 1]], key=lambda r: (r["award_date"], str(r["code"])))  # type: ignore[arg-type,return-value]
    hit = Hit(
        rule=SLUG, authority_key=authority, first_date=first, date=max(r["award_date"] for r in members),  # type: ignore[type-var,arg-type]
        record_codes=tuple(str(r["code"]) for r in members), value_bani=sum(_bani(r, "counted_bani") for r in members), supplier_keys=supplier_keys(members),
        numbers={"ceiling": str(ceiling), "subsequent": str(total), "ratio": total / ceiling}, reproduce=_reproduce(authority, members),
    )
    return hit, [_member(r) for r in members]


def matches(filt: dict, member: Member) -> bool:
    """Whether the search would return `member` for the Signal filter `filt` (authority is the caller's check, `signal` is every member's)."""
    return (filt["from"] <= member.day.isoformat() <= filt["to"] and member.cpv.startswith(filt.get("cpv", ""))
            and ("supplier" not in filt or filt["supplier"] in member.suppliers))


def collisions(found: list[tuple[Hit, list[Member]]]) -> list[tuple[Hit, Hit]]:
    """The pairs (a, b) of Signals of one authority where a member of b would also be returned by a's reproducing filter."""
    out: list[tuple[Hit, Hit]] = []
    by_authority: dict[str, list[tuple[Hit, list[Member]]]] = {}
    for item in found:
        by_authority.setdefault(item[0].authority_key, []).append(item)
    for group in by_authority.values():
        for a, _ in group:
            for b, members in group:
                if a is not b and any(matches(a.reproduce, m) for m in members):
                    out.append((a, b))
    return out


def detect(rows: Iterable[Row]) -> Iterator[Hit]:
    """Rows in `ORDER_BY` order (a notice is one run); keeps one notice's Records and the Signals found, never the whole graph."""
    tagged = ((str(r["notice_code"]), r) for r in rows if r.get("notice_code") and r.get("framework_role"))
    found = [f for _, run in groupby(tagged, key=lambda pair: pair[0]) if (f := _framework(r for _, r in run)) is not None]
    for a, b in collisions(found):
        log.warning("framework-overrun: the filter of the Signal ending %s on %s (%s) also returns Records of another framework of the authority (%s)",
                    a.date, a.authority_key, a.record_codes[0], b.record_codes[0])
    for hit, _ in found:
        yield hit
