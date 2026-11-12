"""The counting rule (#23, #65): the one place that decides what a Record adds to a sum.

`count()` runs once per Record while the rebuild loads it, and its answer is stored (`seap.record.counted_bani`, the badges,
the suspect rule, `seap.search.share_bani`). The API only sums what is stored; it never re-derives any of this.

What the rule says (GLOSSARY: Awarded value, Framework ceiling, Consortium share, Suspect value):

- Awarded value is the only measure summed.
- Blank or zero value: "no value in SEAP". `value` is null (a zero is read as blank; note `value:zero`), badge NO_VALUE, the
  Record counts as a Record and adds nothing to a sum.
- Frameworks (`Incheiat prin`): "Cu acord cadru" is a framework ceiling (badge FRAMEWORK_CEILING, never summed, reported in
  `Total.frameworkCeilings`); "Cu acord cadru subsecvent" is a subsequent contract (badge SUBSEQUENT_CONTRACT, summed, linked to
  its framework by award notice number, see rebuild.py); "Fara acord cadru" and anything else is summed.
- Suspect values (badge SUSPECT_VALUE, `counted` null, counted in `Total.suspectLeftOut`):
  * a DA or DAN at 10 times or more the statutory cap for its date and type (`CAPS`); works are told by `Tip contract` or CPV
    division 45; CPV division 70 (rents) and the other `EXEMPT_CPV_DIVISIONS` are never flagged;
  * a contract or award notice of 1 bn RON or more: 100 times its estimated value or more is suspect; with no estimate, above
    50 bn RON is suspect. The estimated value is fetched from e-licitatie and archived (`pipeline estimates`, estimates.py); the
    rebuild reads only the archive. A Record whose notice was never looked up is left alone and noted `estimate:not_fetched`.
- Consortia: the authority side counts the Record once, at its full value. The supplier side gives every winner an equal share of
  the value in integer bani (`split_evenly`); a natural person (#66) takes a slot like any winner.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from typing import Mapping

RON = 100  # bani per RON: money is integer bani everywhere it is summed

# ---- the statutory cap for a direct acquisition (the same table #79's `over-cap` and `splitting` Signals use) ------------------


@dataclass(frozen=True)
class Cap:
    """The caps in force from `since` (inclusive) until the next era, in bani, without VAT."""

    since: date
    supplies_services: int
    works: int


# Law 98/2016 art. 7(5) thresholds, as the spec publishes them. The 10 September 2022 change applies to a Record whose date (its
# award date, ADR 0002) is on or after that day: the boundary day belongs to the new era. The caps are without VAT; a Record's
# value is compared as published, with no VAT adjustment either way.
CAPS = (
    Cap(date(2000, 1, 1), 135_060 * RON, 450_200 * RON),
    Cap(date(2022, 9, 10), 270_120 * RON, 900_400 * RON),
)
SUSPECT_CAP_MULTIPLE = 10  # DA/DAN at this many times the cap or more
EXEMPT_CPV_DIVISIONS = ("70",)  # rents (CPV 70) and any other category the cap never applied to

CONTRACT_CHECK_FROM = 1_000_000_000 * RON  # contracts and award notices of this value or more are looked up
CONTRACT_ESTIMATE_MULTIPLE = 100
CONTRACT_NO_ESTIMATE_ABOVE = 50_000_000_000 * RON  # above this, with no estimate, is suspect

# SeapRecord.suspect.rule in the GraphQL contract
RULE_CAP = "DIRECT_PURCHASE_10X_CAP"
RULE_ESTIMATE = "CONTRACT_100X_ESTIMATE"
RULE_50BN = "CONTRACT_OVER_50BN"

FRAMEWORK_CEILING = "CEILING"
FRAMEWORK_SUBSEQUENT = "SUBSEQUENT"


def _fold(text: str | None) -> str:
    stripped = "".join(c for c in unicodedata.normalize("NFKD", text or "") if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped.lower()).strip()


def cap_for(day: date, works: bool) -> int:
    """The cap in bani in force on `day` (the latest era that began on or before it)."""
    era = max((c for c in CAPS if c.since <= day), key=lambda c: c.since, default=CAPS[0])
    return era.works if works else era.supplies_services


def is_works(contract_type: str | None, cpv_code: str | None) -> bool:
    """Works by `Tip contract` (Lucrari) or by CPV division 45."""
    return _fold(contract_type).startswith("lucrari") or (cpv_code or "").strip()[:2] == "45"


def framework_role(concluded_by: str | None) -> str | None:
    """`Incheiat prin`: CEILING for "Cu acord cadru", SUBSEQUENT for "Cu acord cadru subsecvent", else None (summed as it is)."""
    text = _fold(concluded_by)
    if text.startswith("cu acord cadru"):
        return FRAMEWORK_SUBSEQUENT if "subsecvent" in text else FRAMEWORK_CEILING
    return None


def split_evenly(amount: int, parts: int) -> list[int]:
    """An equal share per winner, in integer bani, that sums back to `amount` exactly. The remainder bani (fewer than `parts`)
    go one each to the first winners in their published order: 100 bani over 3 winners is 34, 33, 33."""
    base, extra = divmod(amount, parts)
    return [base + 1 if i < extra else base for i in range(parts)]


@dataclass(frozen=True)
class Estimate:
    """What the archived e-licitatie lookup of one notice says. `bani` is None when the notice has no usable estimate (blank, zero,
    not in RON, or the notice was not found)."""

    bani: int | None


@dataclass(frozen=True)
class Counted:
    value_bani: int | None  # null = no value in SEAP (blank or zero)
    counted_bani: int | None  # null = not summed
    badges: tuple[str, ...]  # counting badges, in the contract's enum order
    framework_role: str | None
    suspect_rule: str | None
    suspect_threshold_bani: int | None  # the cap in force, or the estimated value; null for CONTRACT_OVER_50BN
    notes: tuple[str, ...] = ()
    shares: tuple[int, ...] = ()  # per winner, of the value (what the Record shows); empty unless several winners
    counted_shares: tuple[int, ...] = ()  # per winner, of the counted value: what the supplier side sums (one per winner, a sole winner has all)


def count(
    kind: str,
    value_bani: int | None,
    award_date: date,
    contract_type: str | None,
    cpv_code: str | None,
    concluded_by: str | None,
    notice_code: str | None,
    winners: int,
    estimates: Mapping[str, Estimate] | None = None,
) -> Counted:
    """What one Record adds to a sum, and why. Pure: the lookups it needs (`estimates`) come from the archive."""
    notes: list[str] = []
    if value_bani is not None and value_bani <= 0:
        if value_bani == 0:
            notes.append("value:zero")
        value_bani = None  # blank or zero: no value in SEAP
    role = framework_role(concluded_by)
    rule, threshold = None, None
    if value_bani is not None:
        if kind in ("DA", "DAN"):
            cpv_division = (cpv_code or "").strip()[:2]
            if cpv_division not in EXEMPT_CPV_DIVISIONS:
                cap = cap_for(award_date, is_works(contract_type, cpv_code))
                if value_bani >= SUSPECT_CAP_MULTIPLE * cap:
                    rule, threshold = RULE_CAP, cap
        elif value_bani >= CONTRACT_CHECK_FROM and notice_code:
            known = (estimates or {}).get(notice_code)
            if known is None:
                notes.append("estimate:not_fetched")  # never looked up: the rule cannot be applied yet (`pipeline estimates`)
            elif known.bani and value_bani >= CONTRACT_ESTIMATE_MULTIPLE * known.bani:
                rule, threshold = RULE_ESTIMATE, known.bani
            elif not known.bani and value_bani > CONTRACT_NO_ESTIMATE_ABOVE:
                rule, threshold = RULE_50BN, None
    counted = None if value_bani is None or rule or role == FRAMEWORK_CEILING else value_bani
    badges = [
        *(["FRAMEWORK_CEILING"] if role == FRAMEWORK_CEILING else []),
        *(["SUBSEQUENT_CONTRACT"] if role == FRAMEWORK_SUBSEQUENT else []),
        *(["CONSORTIUM_SHARE"] if winners > 1 else []),
        *(["SUSPECT_VALUE"] if rule else []),
        *(["NO_VALUE"] if value_bani is None else []),
    ]
    return Counted(
        value_bani=value_bani, counted_bani=counted, badges=tuple(badges), framework_role=role, suspect_rule=rule,
        suspect_threshold_bani=threshold, notes=tuple(notes),
        shares=tuple(split_evenly(value_bani, winners)) if value_bani is not None and winners > 1 else (),
        counted_shares=tuple(split_evenly(counted, max(winners, 1))) if counted is not None else (),
    )
