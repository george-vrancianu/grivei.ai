"""What every Signal rule shares (#74): the row a rule reads, the `Hit` it returns and the grouping of single-Record rules.

A rule is a module exposing the same four names, so adding one is one small, self-contained change (see `signals/__init__.py`):

- `SLUG`: the GraphQL enum value (`OVER_CAP`), stored as is, so the API never maps slugs.
- `KINDS`: the Record kinds the rule reads (`DA`, `DAN`, `CONTRACT`, `AWARD_NOTICE`). They are the rule's population for the base rate and
  decide its data-through date.
- `WHERE`: a SQL predicate over `seap.record` that narrows the rows handed to `detect` (a superset: `detect` decides).
- `detect(rows) -> list[Hit]`: pure over row dicts (`Row`), no database.

A Signal is a set of Records with no stored public id. It is addressed by its reproducing filter (`Hit.reproduce`), which the API serves
as `Signal.reproduce` and which, run as a `RecordFilter` through `seap.search`, must return exactly the Signal's Records.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Callable, Iterable, Mapping

# The columns of `seap.record` a rule may read (signals/__init__.py `ROW_COLUMNS`): `winners` is the stored jsonb list.
Row = Mapping[str, object]


@dataclass(frozen=True)
class Hit:
    """One Signal: a rule's finding over a set of Records. `numbers` has the fields of the rule's GraphQL numbers type (bani as strings)."""

    rule: str
    authority_key: str
    first_date: date
    date: date  # its latest Record's award date (ADR 0002: the publication date stands in when there is none, already in `award_date`)
    record_codes: tuple[str, ...]
    value_bani: int  # what its Records add to a sum (the counted values; a blank, suspect or ceiling Record adds none): the VALUE_DESC order
    supplier_keys: tuple[str, ...]  # every winner entity of its Records, consortium members included; a natural person has no key
    numbers: dict
    reproduce: dict  # the RecordFilterValue: authority, supplier, signal, cpv, from, to (only the fields it needs)


def supplier_keys(rows: Iterable[Row]) -> tuple[str, ...]:
    """Every winner entity key in `rows`, sorted. Natural persons (no key) are omitted."""
    keys: set[str] = set()
    for row in rows:
        for w in row.get("winners") or ():
            if w.get("key") and not w.get("naturalPerson"):
                keys.add(w["key"])
    return tuple(sorted(keys))


def authority_day_hits(
    rule: str,
    rows: Iterable[Row],
    match: Callable[[Row], dict | None],
    combine: Callable[[list[tuple[Row, dict]]], dict],
) -> list[Hit]:
    """The grouping of the single-Record rules: one Signal per (authority, award day), holding every Record of that authority and day
    that `match` accepts. `combine` makes the Signal's `numbers` from its Records' own numbers.

    Why this grouping: the reproducing filter is `authority + signal + from = to = day`, and a Record is in a Signal of a rule exactly
    when `match` accepts it, so the filter returns exactly the Signal's Records: two Records of one authority on one day, a natural-person
    winner (no supplier key to filter on), a consortium and a Record in the Signals of two rules all stay exact (a supplier in the filter
    would break each of them)."""
    groups: dict[tuple[str, date], list[tuple[Row, dict]]] = {}
    for row in rows:
        authority = row.get("authority_key")
        found = match(row) if authority else None
        if found is not None:
            groups.setdefault((authority, row["award_date"]), []).append((row, found))  # type: ignore[arg-type]
    hits = []
    for (authority, day), members in sorted(groups.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        members.sort(key=lambda m: m[0]["code"])  # type: ignore[arg-type,return-value]
        hits.append(Hit(
            rule=rule, authority_key=authority, first_date=day, date=day, record_codes=tuple(str(r["code"]) for r, _ in members),
            value_bani=sum(int(r["counted_bani"] or 0) for r, _ in members), supplier_keys=supplier_keys(r for r, _ in members),
            numbers=combine(members), reproduce={"authority": authority, "signal": rule, "from": day.isoformat(), "to": day.isoformat()},
        ))
    return hits
