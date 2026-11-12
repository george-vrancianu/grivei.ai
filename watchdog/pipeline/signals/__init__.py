"""Signals (#24, #74): sets of Records a rule picks out, recomputed after every load in the load's own transaction.

`build_signals(cur, data_through)` runs inside `rebuild()`, after the Records, the search rows and the entities are in and BEFORE the
rollup and the search index are built, so the has-Signals chip, the rollup and the scan agree. It fills, from scratch each load:

- `seap.signal`: one row per Signal (an internal ordinal `id`, never public: a Signal is addressed by its reproducing filter),
  with its dates, authority, suppliers, `numbers` and `reproduce` (jsonb, the field names of the GraphQL types);
- `seap.signal_member`: its Records;
- `seap.signal_rule`: per rule its window, base rate, base-rate year and data-through date;
- `seap.search.signals` / `has_signals`: the rule slugs each Record belongs to, which the `signal` and has-Signals filters read.

How to add a rule: write `signals/<rule>.py` exposing `SLUG`, `KINDS`, `WHERE`, `detect(rows) -> list[Hit]` (see common.py; the
single-Record rules call `authority_day_hits`; a rule that groups Records may also declare `ORDER_BY`, a fixed SQL ordering (default
`code`), so that it sees one group after another and keeps only one group in memory, as `splitting` does), add the module to `RULES` below, add the numbers' fields to the rule's GraphQL numbers
type if they are not there yet (the API maps `numbers` jsonb to that type by slug in `explorer/packages/api/src/signals.ts`
`NUMBERS_TYPE`, nothing else is per rule). Tests: pure ones over row dicts, plus the Signal fixture archive and seam 1.

The base rate (story 80) is the fraction of contracting authorities, among those the rule could see (an authority with at least one
Record of the rule's kinds in the year), that have at least one Signal of the rule dated in `baseRateYear`: the latest calendar year
before the data-through year that the rule has Records for (a complete year), else the latest year it has. The window starts on 1 January
of the first year the rule has Records for (never before the rule's optional `WINDOW_FROM`, e.g. framework-overrun's 2021-01-01) and is open at the end (`dataThrough` says how far the data goes).
"""
from __future__ import annotations

from datetime import date
from types import ModuleType

import psycopg
from psycopg.types.json import Jsonb

from . import framework_overrun, no_publication, over_cap, splitting
from .common import Hit

# The contract's SignalRuleSlug order. Every rule is a module with SLUG, KINDS, WHERE and detect.
RULES: tuple[ModuleType, ...] = (over_cap, splitting, framework_overrun, no_publication)

ROW_COLUMNS = "code, kind, channel, authority_key, award_date, value_bani, counted_bani, suspect, cpv_code, contract_type, procedure, winners, notice_code, framework_role, ceiling_bani"


def _rows(cur: psycopg.Cursor, where: str, order_by: str = "code"):
    """The candidate Records of a rule, streamed from the database as dicts (a rule keeps only what it groups), in the rule's `ORDER_BY`
    (default `code`)."""
    with cur.connection.cursor(name="signal_rows", row_factory=psycopg.rows.dict_row) as stream:
        stream.itersize = 20_000
        stream.execute(f"SELECT {ROW_COLUMNS} FROM seap.record WHERE {where} ORDER BY {order_by}")  # fixed strings from the rule module
        yield from stream


def find(cur: psycopg.Cursor) -> list[Hit]:
    """Every rule's Signals, in a deterministic order (the same data always gives the same ordinals)."""
    hits: list[Hit] = []
    for rule in RULES:
        hits += sorted(rule.detect(_rows(cur, rule.WHERE, getattr(rule, "ORDER_BY", "code"))), key=lambda h: (h.date, h.authority_key, h.record_codes))
    return hits


def _base_rate(cur: psycopg.Cursor, rule: ModuleType, through: date) -> tuple[int, int, int] | None:
    """(year, authorities with a Signal dated in it, authorities the rule could see in it), or None when the rule has no Records."""
    cur.execute("SELECT DISTINCT extract(year FROM award_date)::int FROM seap.record WHERE kind = ANY(%s) ORDER BY 1", (list(rule.KINDS),))
    years = [y for (y,) in cur.fetchall()]
    if not years:
        return None
    complete = [y for y in years if y < through.year]
    year = max(complete or years)
    cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.record WHERE kind = ANY(%s) AND authority_key IS NOT NULL "
                "AND extract(year FROM award_date) = %s", (list(rule.KINDS), year))
    seen = cur.fetchone()[0]
    cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.signal WHERE rule = %s AND extract(year FROM last_date) = %s", (rule.SLUG, year))
    return year, cur.fetchone()[0], seen


def build_signals(cur: psycopg.Cursor, data_through: dict[str, str]) -> dict[str, int]:
    """Recompute every Signal, the rules' windows and base rates, and the search rows' Signal columns. Returns the Signals per rule.
    `data_through` is the per-kind date the rebuild reports (`DATA_THROUGH_SQL`); the rule's is the earliest of its loaded kinds."""
    hits = find(cur)
    cur.executemany(
        "INSERT INTO seap.signal (id, rule, authority_key, last_date, first_date, record_count, value_bani, supplier_keys, numbers, reproduce) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        [(n, h.rule, h.authority_key, h.date, h.first_date, len(h.record_codes), h.value_bani, list(h.supplier_keys), Jsonb(h.numbers), Jsonb(h.reproduce))
         for n, h in enumerate(hits, start=1)],
    )
    cur.executemany("INSERT INTO seap.signal_member (signal_id, record_code) VALUES (%s, %s)",
                    [(n, c) for n, h in enumerate(hits, start=1) for c in h.record_codes])
    for rule in RULES:
        kinds = [data_through[k] for k in rule.KINDS if k in data_through]
        if not kinds:  # a crawled kind with a hole has no data-through: the latest publication the rule has seen stands in
            cur.execute("SELECT max(published_on) FROM seap.record WHERE kind = ANY(%s)", (list(rule.KINDS),))
            latest = cur.fetchone()[0]
            if latest is None:
                continue  # the rule has seen no data: no window, no base rate, no methodology row
            kinds = [latest.isoformat()]
        through = date.fromisoformat(min(kinds))
        rate = _base_rate(cur, rule, through)
        if rate is None:
            continue
        year, with_signal, seen = rate
        cur.execute(
            "INSERT INTO seap.signal_rule (slug, window_from, window_to, base_rate, base_rate_year, data_through, authorities, with_signal) "
            "VALUES (%s, GREATEST(make_date((SELECT min(extract(year FROM award_date))::int FROM seap.record WHERE kind = ANY(%s)), 1, 1), %s::date), NULL, %s, %s, %s, %s, %s)",
            (rule.SLUG, list(rule.KINDS), getattr(rule, "WINDOW_FROM", date.min), with_signal / seen if seen else 0.0, year, through, seen, with_signal),
        )
    # the search rows carry the rule slugs of their Record: the signal and has-Signals filters read them, the rollup copies has_signals
    cur.execute(
        """UPDATE seap.search s SET signals = m.rules, has_signals = true
             FROM (SELECT sm.record_code, array_agg(DISTINCT g.rule ORDER BY g.rule) AS rules
                     FROM seap.signal_member sm JOIN seap.signal g ON g.id = sm.signal_id GROUP BY sm.record_code) m
            WHERE s.record_code = m.record_code""")
    cur.execute("ANALYZE seap.signal")
    counts = {r.SLUG: 0 for r in RULES}
    for h in hits:
        counts[h.rule] += 1
    return counts
