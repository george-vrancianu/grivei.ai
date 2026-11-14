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

A rule that reads a Reference source (#184) declares `load(cur) -> context | None` too: it reads the small slice of ONRC, ANAF or the financial
statements that concerns the suppliers of this load, once, and returns None when that source is not loaded (the rule then finds nothing and has no
`signal_rule` row, so the methodology never shows a 0% rate for a source that is simply absent). Its `detect(rows, context)` stays pure, and an
optional `where(context) -> (sql, params)` narrows the rows streamed to the Records the context can concern. The context is never a Signal on its own:
only a Record that matches the rule's thresholds is.

The base rate (story 80) is the fraction of contracting authorities, among those the rule could see (an authority with at least one
Record of the rule's kinds in the year), that have at least one Signal of the rule dated in `baseRateYear`: the latest calendar year
before the data-through year that the rule has Records for (a complete year), else the latest year it has. The window starts on 1 January
of the first year the rule has Records for (never before the rule's optional `WINDOW_FROM`, e.g. framework-overrun's 2021-01-01; the base rate works in whole years, so a floor should be a 1 January) and is open at the end (`dataThrough` says how far the data goes). A rule that reads a Reference source and can only evaluate some years (few-employees, no-financial-statement)
declares `base_year(context)`, the year it measures in instead. A rule that sees only a slice of the time (insolvency: the 6 months to ONRC's newest
snapshot) declares `base_window(context) -> (first day, last day)`: its base rate counts the authorities with a Record, and with a Signal, in that window, and
`baseRateYear` is the window's last year.
"""
from __future__ import annotations

from datetime import date
from types import ModuleType

import psycopg
from psycopg.types.json import Jsonb

from . import (after_strike_off, few_employees, framework_overrun, insolvency, no_construction_caen, no_financial_statement, no_publication, over_cap,
               splitting, young_firm)
from .common import Hit

# The contract's SignalRuleSlug order. Every rule is a module with SLUG, KINDS, WHERE and detect; the last six (#184) also read a Reference source
# (ONRC, ANAF, the financial statements) and so declare `load` too (see below).
RULES: tuple[ModuleType, ...] = (over_cap, splitting, framework_overrun, no_publication, young_firm, no_construction_caen, after_strike_off, insolvency,
                                 few_employees, no_financial_statement)

ROW_COLUMNS = "code, kind, channel, authority_key, award_date, value_bani, counted_bani, suspect, cpv_code, contract_type, procedure, winners, notice_code, framework_role, ceiling_bani"


def _rows(cur: psycopg.Cursor, where: str, order_by: str = "code", params: tuple = ()):
    """The candidate Records of a rule, streamed from the database as dicts (a rule keeps only what it groups), in the rule's `ORDER_BY`
    (default `code`)."""
    with cur.connection.cursor(name="signal_rows", row_factory=psycopg.rows.dict_row) as stream:
        stream.itersize = 20_000
        sql = f"SELECT {ROW_COLUMNS} FROM seap.record WHERE {where} ORDER BY {order_by}"  # fixed strings from the rule module
        if params:  # a rule with params writes a literal % as %%; without params the SQL goes as is, so the older rules' fixed WHERE strings may hold a bare %
            stream.execute(sql, params)
        else:
            stream.execute(sql)
        yield from stream


def find(cur: psycopg.Cursor, absent: set[str] | None = None, contexts: dict | None = None) -> list[Hit]:
    """Every rule's Signals, in a deterministic order (the same data always gives the same ordinals). A rule whose Reference source is not loaded
    finds nothing; its slug is added to `absent` when the caller passes one, and the contexts the rules loaded are put in `contexts` by slug."""
    hits: list[Hit] = []
    for rule in RULES:
        order_by = getattr(rule, "ORDER_BY", "code")
        if hasattr(rule, "load"):
            context = rule.load(cur)
            if context is None:
                if absent is not None:
                    absent.add(rule.SLUG)
                continue
            if contexts is not None:
                contexts[rule.SLUG] = context
            where, params = rule.where(context) if hasattr(rule, "where") else (rule.WHERE, ())
            found = rule.detect(_rows(cur, where, order_by, params), context)
        else:
            found = rule.detect(_rows(cur, rule.WHERE, order_by))
        hits += sorted(found, key=lambda h: (h.date, h.authority_key, h.record_codes))
    return hits


def _base_rate(cur: psycopg.Cursor, rule: ModuleType, through: date, context: object = None) -> tuple[int, int, int] | None:
    """(year, authorities with a Signal dated in it, authorities the rule could see in it), or None when the rule has no Records."""
    cur.execute("SELECT DISTINCT extract(year FROM award_date)::int FROM seap.record WHERE kind = ANY(%s) ORDER BY 1", (list(rule.KINDS),))
    years = [y for (y,) in cur.fetchall() if y >= getattr(rule, "WINDOW_FROM", date.min).year]  # a year before the rule's window is not one it could see
    if not years:
        return None
    window = rule.base_window(context) if hasattr(rule, "base_window") else None  # (first day, last day) of a rule that only sees a slice of the time
    if window is not None:
        year = window[1].year
        cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.record WHERE kind = ANY(%s) AND authority_key IS NOT NULL "
                    "AND award_date BETWEEN %s AND %s", (list(rule.KINDS), *window))
        seen = cur.fetchone()[0]
        cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.signal WHERE rule = %s AND last_date BETWEEN %s AND %s", (rule.SLUG, *window))
        return year, cur.fetchone()[0], seen
    complete = [y for y in years if y < through.year]
    year = rule.base_year(context) if hasattr(rule, "base_year") else max(complete or years)  # a rule that can only see some years says which
    cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.record WHERE kind = ANY(%s) AND authority_key IS NOT NULL "
                "AND extract(year FROM award_date) = %s", (list(rule.KINDS), year))
    seen = cur.fetchone()[0]
    cur.execute("SELECT count(DISTINCT authority_key)::int FROM seap.signal WHERE rule = %s AND extract(year FROM last_date) = %s", (rule.SLUG, year))
    return year, cur.fetchone()[0], seen


def build_signals(cur: psycopg.Cursor, data_through: dict[str, str]) -> dict[str, int]:
    """Recompute every Signal, the rules' windows and base rates, and the search rows' Signal columns. Returns the Signals per rule.
    `data_through` is the per-kind date the rebuild reports (`DATA_THROUGH_SQL`); the rule's is the earliest of its loaded kinds."""
    absent: set[str] = set()
    contexts: dict = {}
    hits = find(cur, absent, contexts)
    cur.executemany(
        "INSERT INTO seap.signal (id, rule, authority_key, last_date, first_date, record_count, value_bani, supplier_keys, numbers, reproduce) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        [(n, h.rule, h.authority_key, h.date, h.first_date, len(h.record_codes), h.value_bani, list(h.supplier_keys), Jsonb(h.numbers), Jsonb(h.reproduce))
         for n, h in enumerate(hits, start=1)],
    )
    cur.executemany("INSERT INTO seap.signal_member (signal_id, record_code) VALUES (%s, %s)",
                    [(n, c) for n, h in enumerate(hits, start=1) for c in h.record_codes])
    for rule in RULES:
        if rule.SLUG in absent:
            continue  # its Reference source is not loaded: no window, no base rate, no methodology row
        kinds = [data_through[k] for k in rule.KINDS if k in data_through]
        if not kinds:  # a crawled kind with a hole has no data-through: the latest publication the rule has seen stands in
            cur.execute("SELECT max(published_on) FROM seap.record WHERE kind = ANY(%s)", (list(rule.KINDS),))
            latest = cur.fetchone()[0]
            if latest is None:
                continue  # the rule has seen no data: no window, no base rate, no methodology row
            kinds = [latest.isoformat()]
        through = date.fromisoformat(min(kinds))
        rate = _base_rate(cur, rule, through, contexts.get(rule.SLUG))
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
