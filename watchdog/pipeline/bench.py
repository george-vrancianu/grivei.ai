"""The keystroke latency benchmark (#91): the performance gate of spec #37, runnable against any database or API.

One keystroke on the main screen is a RecordFilter (the URL state) and everything the screen shows from its matching set. The API
(`explorer/packages/api/src/store.ts`) answers it with several statements on pooled connections, in parallel across the screen's
parts. This module issues the same statements, in the same shape (`buildWhere`: every folded token but the last `&&&`, the last a
`pdb.regex` prefix, chips as plain predicates; `rollupPlan`: the empty and chips-only states from the rollup tables), times each
statement and the whole keystroke, and checks the result against a threshold (default 500 ms, the spec's target on 8 vCPU).

Two modes:
- SQL (`run_sql`): straight to the database, no API needed. The statements below mirror store.ts (a change there needs the same change
  here). What keeps them from drifting: `tests/test_bench_parity.py` compares `build_where` and `rollup_plan` with the API's own
  `buildWhere` / `rollupPlan` over every shipped query (the vitest `explorer/packages/api/test/benchParity.test.ts` writes the
  expectations into `tests/fixtures/bench_parity.json` and fails when they are stale); the statement sequences of the entity tabs, the
  map and the Records tab are pinned by `tests/test_bench.py` only, so read store.ts again when it changes.
- API (`run_api`): POSTs the persisted `MainScreen` operation to a running API and times the whole response. The first request of a
  query is the one that misses the API's result cache (unless warmed), the repeats are cache hits. The empty state and the 2-character
  prefixes must be answered from the warmed cache (`expect_cached`): their first request is held to `--cached-ms`.

What one keystroke runs here, per part of the screen: `total`, ONE Money-lens map (the side the filter's `countySide` names, default
AUTHORITY, as MainScreen asks for one), both entity tabs (rank, then the page's entities and placement), the Records tab (the Top-K
page, hydrated with its entities and source files; the empty state's page is `seap.record`, as `store.records` reads it) and, for a
text query, the Go-to lookup, and `dataThrough` (every MainScreen request asks for it, and the API does not cache it: it is a scan of
`seap.record`, `store.dataThrough`). Left out: `signalsOfRecords` (the Signal badges of the page), `facets`, `counties()` and the
echo of a chip's entity: small keyed reads that share the 8-connection pool but never scan the index.

Pure parts (no database): `build_where`, `rollup_plan`, `plan_tasks`, `summarize`, `verdict`, `render_table`, `load_queries`.
"""
from __future__ import annotations

import json
import os
import re
import statistics
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .fold import tokens

DEFAULT_THRESHOLD_MS = 500.0
TARGET_VCPUS = 8
DEFAULT_QUERIES = Path(__file__).with_name("bench_queries.json")
PAGE = 50  # the main screen's tabs show 50 rows
AGG_BUCKET_CAP = 65_000  # store.ts: Tantivy's terms-aggregation bucket cap; the exact GROUP BY serves up to this many entities
SIDE_KEY = {"AUTHORITY": "authority_key", "SUPPLIER": "supplier_key"}
AREA = {"AUTHORITY": ("authority_area", "authority_key"), "SUPPLIER": ("supplier_area", "supplier_key")}
RECORD_ORDER = "value_bani DESC NULLS LAST, record_code"  # the default Records tab order (VALUE_DESC) on seap.search
RECORD_COLUMNS = (  # store.ts RECORD_COLUMNS: what the API reads of a Record page
    "code, title, award_date::text AS date, kind, channel, procedure, value_bani::text AS value, counted_bani::text AS counted, authority_name, badges, "
    "suspect_rule, suspect_threshold_bani::text AS suspect_threshold, crawl_status, via AS record_via, url, cpv_code, cpv_description"
)
RECORD_TABLE_ORDER = "value_bani DESC NULLS LAST, code"  # the same on seap.record (the empty state)


# ---- the filter -> SQL mapping (mirror of explorer/packages/api/src/search.ts and rollup.ts) -------------------------------------


@dataclass
class Where:
    sql: str  # a predicate over seap.search with `%s` placeholders, never empty
    params: list
    winner_side: bool  # the filter restricts the winners: a Record can match on several rows
    empty: bool  # nothing narrows the set
    q_folded: str | None


def _regex_escape(s: str) -> str:
    return re.sub(r"[.*+?^${}()|\[\]\\]", lambda m: "\\" + m.group(0), s)


def build_where(f: dict) -> Where:
    """The RecordFilter (a dict with the API's field names) as a WHERE over seap.search, as `buildWhere` builds it."""
    params: list = []
    preds: list[str] = []
    narrowed = False
    winner_side = False

    def add(pred: str, *values) -> None:
        nonlocal narrowed
        narrowed = True
        preds.append(pred)
        params.extend(values)

    toks = tokens(f.get("q") or "")
    if toks:
        if len(toks) > 1:
            add("doc &&& %s::text", " ".join(toks[:-1]))
        add("doc @@@ pdb.regex(%s::text)", _regex_escape(toks[-1]) + ".*")
    if f.get("from"):
        add("award_date >= %s::date", f["from"])
    if f.get("to"):
        add("award_date <= %s::date", f["to"])
    if f.get("channel"):
        add("channel = %s", f["channel"])
    if f.get("valueBucket"):
        add("value_bucket = %s", f["valueBucket"])
    if f.get("badges"):
        add("badges @> %s::text[]", list(f["badges"]))
    if f.get("procedure"):
        add("procedure = ANY(%s::text[])", list(f["procedure"]))
    if f.get("cpv"):
        add("cpv_code @@@ pdb.regex(%s::text)", _regex_escape(f["cpv"]) + ".*")
    if f.get("authority"):
        add("authority_key = %s", f["authority"])
    if f.get("supplier"):
        winner_side = True
        add("supplier_key = %s", f["supplier"])
    if f.get("uat"):
        add("authority_uat = %s", f["uat"])
    if f.get("hasSignals") is not None:
        add("has_signals = %s", bool(f["hasSignals"]))
    if f.get("signal"):
        add("signals @> ARRAY[%s]::text[]", f["signal"])
    if f.get("county"):
        supplier_side = f.get("countySide") == "SUPPLIER"
        winner_side = winner_side or supplier_side
        add(f"{'supplier_area' if supplier_side else 'authority_area'} = %s", f["county"])
    if not toks:
        preds.insert(0, "id @@@ pdb.all()")  # the "no text" predicate: lets the aggregates push down
    return Where(" AND ".join(preds), params, winner_side, not narrowed, " ".join(toks) or None)


_JAN_1 = re.compile(r"^(\d{4})-01-01$")
_DEC_31 = re.compile(r"^(\d{4})-12-31$")


def rollup_plan(f: dict) -> dict | None:
    """The cube plan that serves the filter, or None when it needs the scan (mirror of `rollupPlan`)."""
    if tokens(f.get("q") or ""):
        return None
    if f.get("badges") or f.get("procedure"):
        return None
    if any(f.get(k) for k in ("cpv", "authority", "supplier", "county", "uat", "signal")):
        return None
    year_from = year_to = None
    if f.get("from"):
        m = _JAN_1.match(f["from"])
        if not m:
            return None
        year_from = int(m.group(1))
    if f.get("to"):
        m = _DEC_31.match(f["to"])
        if not m:
            return None
        year_to = int(m.group(1))
    return {"yearFrom": year_from, "yearTo": year_to, "channel": f.get("channel"), "valueBucket": f.get("valueBucket"), "hasSignals": f.get("hasSignals")}


def rollup_where(plan: dict) -> tuple[str, list]:
    preds: list[str] = []
    params: list = []
    if plan["yearFrom"] is not None:
        preds.append("award_year >= %s")
        params.append(plan["yearFrom"])
    if plan["yearTo"] is not None:
        preds.append("award_year <= %s")
        params.append(plan["yearTo"])
    if plan["channel"]:
        preds.append("channel = %s")
        params.append(plan["channel"])
    if plan["valueBucket"]:
        preds.append("value_bucket = %s")
        params.append(plan["valueBucket"])
    if plan["hasSignals"] is not None:
        preds.append("has_signals = %s")
        params.append(plan["hasSignals"])
    return (" AND ".join(preds) or "true"), params


def state_of(f: dict) -> str:
    """`empty` (nothing narrows), `chips` (no text, chips the rollup serves), `chips-scan` (no text, but a chip that is not a rollup
    dimension: badges, procedure, partial dates, county, entity, CPV, Signal; judged like a text query), `text` (a text query)."""
    w = build_where(f)
    if w.q_folded:
        return "text"
    if w.empty:
        return "empty"
    return "chips" if rollup_plan(f) else "chips-scan"


# ---- the statements of one keystroke (mirror of store.ts) ---------------------------------------------------------------------

_TOTAL_FIELDS = (
    "coalesce(sum(sh), 0)::text AS awarded, count(*)::int AS records, (count(*) FILTER (WHERE suspect))::int AS suspect_left_out, "
    "(count(*) FILTER (WHERE no_value))::int AS no_value, coalesce(sum(ceil), 0)::text AS framework_ceilings"
)
_GROUPED = "sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil"


@dataclass
class Task:
    """One part of the screen: a name, how it is served, and a function that runs its statements through `timed`."""

    name: str
    serving: str  # "rollup", "scan", "mixed" (a chips-only Records page: the count comes from the rollup, the Top-K page is an index query by design) or "record" (a read of seap.record)
    statements: list[str]  # the statement names, in the order they run (the API runs them in sequence within a task)
    alternatives: list[str] = field(default_factory=list)  # statements that replace one of the above in some case (the terms aggregation instead of the exact rank)
    rollup_statements: list[str] = field(default_factory=list)  # the statements that must read the rollup tables (checked with EXPLAIN)
    judged_in_rollup_state: bool = True  # False: reported, but judged only with --strict-maps (the Money lens map has no rollup path)
    run: Callable[[Callable], None] = field(repr=False, default=lambda timed: None)


def plan_tasks(f: dict, *, rollup: bool = True, exact_group_limit: int = AGG_BUCKET_CAP) -> list[Task]:
    """The tasks one keystroke runs for filter `f`, each with the names of its statements and whether the rollup or the scan serves it.
    The `run` of a task drives `timed(name, sql, params) -> rows` (the executor times it)."""
    w = build_where(f)
    plan = rollup_plan(f) if rollup else None
    tasks: list[Task] = []

    # total: rollup_cube or the scan
    if plan:
        rwhere, rparams = rollup_where(plan)
        total_sql = (
            "SELECT coalesce(sum(awarded), 0)::text, coalesce(sum(records), 0)::int, coalesce(sum(suspect_left_out), 0)::int, coalesce(sum(no_value), 0)::int, "
            f"coalesce(sum(framework_ceilings), 0)::text FROM seap.rollup_cube WHERE {rwhere}"
        )
        tasks.append(Task("total", "rollup", ["total"], rollup_statements=["total"], run=lambda timed, s=total_sql, p=rparams: timed("total", s, p)))
    else:
        if w.winner_side:
            total_sql = f"SELECT {_TOTAL_FIELDS} FROM (SELECT record_code, {_GROUPED} FROM seap.search WHERE {w.sql} GROUP BY record_code) g"
        else:
            total_sql = (
                "SELECT coalesce(sum(share_bani), 0)::text, (count(*) FILTER (WHERE winner_position = 1))::int, "
                "(count(*) FILTER (WHERE winner_position = 1 AND suspect))::int, (count(*) FILTER (WHERE winner_position = 1 AND value_bani IS NULL))::int, "
                f"coalesce(sum(ceiling_bani) FILTER (WHERE winner_position = 1), 0)::text FROM seap.search WHERE {w.sql}"
            )
        tasks.append(Task("total", "scan", ["total"], run=lambda timed, s=total_sql, p=w.params: timed("total", s, p)))

    # the Money lens: ONE side per request (MainScreen asks `map` with the filter's countySide, default AUTHORITY: resolvers.ts). Always the
    # scan: store.ts `searchMap` has no rollup path, the API's result cache answers the warmed states.
    side = "SUPPLIER" if f.get("countySide") == "SUPPLIER" else "AUTHORITY"
    area, entity = AREA[side]
    if side == "SUPPLIER" or w.winner_side:
        totals = (
            f"SELECT area, coalesce(sum(sh), 0)::text, count(*)::int, (count(*) FILTER (WHERE suspect))::int, (count(*) FILTER (WHERE no_value))::int, coalesce(sum(ceil), 0)::text "
            f"FROM (SELECT {area} AS area, record_code, {_GROUPED} FROM seap.search WHERE {w.sql} GROUP BY {area}, record_code) g GROUP BY area ORDER BY area"
        )
    else:
        totals = (
            f"SELECT {area} AS area, coalesce(sum(share_bani), 0)::text, (count(*) FILTER (WHERE winner_position = 1))::int, "
            "(count(*) FILTER (WHERE winner_position = 1 AND suspect))::int, (count(*) FILTER (WHERE winner_position = 1 AND value_bani IS NULL))::int, "
            f"coalesce(sum(ceiling_bani) FILTER (WHERE winner_position = 1), 0)::text FROM seap.search WHERE {w.sql} GROUP BY {area} ORDER BY area"
        )
    distinct = f"SELECT {area} AS area, count(DISTINCT {entity})::int FROM seap.search WHERE {w.sql} GROUP BY {area}"

    def run_map(timed, totals=totals, distinct=distinct, p=w.params):
        timed("map_totals", totals, p)
        timed("map_entities", distinct, p)

    tasks.append(Task("map", "scan", ["map_totals", "map_entities"], judged_in_rollup_state=False, run=run_map))

    # the entity tabs: rank, then the page's entities and placement (`entitiesOf`)
    for side in ("AUTHORITY", "SUPPLIER"):
        key = SIDE_KEY[side]
        name = f"entities_{side.lower()}"
        if plan:
            rwhere, rparams = rollup_where(plan)
            sql = (
                "SELECT entity_key AS key, coalesce(sum(awarded), 0)::text AS awarded, sum(records)::int, sum(suspect_left_out)::int, sum(no_value)::int, "
                "coalesce(sum(framework_ceilings), 0)::text, count(*) OVER ()::int AS n "
                f"FROM seap.rollup_entity WHERE side = %s AND {rwhere} GROUP BY entity_key ORDER BY sum(awarded) DESC NULLS LAST, entity_key LIMIT {PAGE} OFFSET 0"
            )

            def run_rollup_entities(timed, n=name, s=sql, p=[side, *rparams]):
                ranked = timed(f"{n}_rank", s, p)
                _hydrate_entities(timed, n, [row[0] for row in ranked])

            tasks.append(Task(name, "rollup", [f"{name}_rank", f"{name}_entities", f"{name}_placement"], rollup_statements=[f"{name}_rank"], run=run_rollup_entities))
            continue

        def run_entities(timed, key=key, name=name):
            card = timed(f"{name}_cardinality", f"SELECT pdb.agg('{{\"cardinality\":{{\"field\":\"{key}\"}}}}'::jsonb) FROM seap.search WHERE {w.sql}", w.params)
            estimate = round(float(card[0][0]["value"])) if card and card[0][0] else 0
            ranked = None
            if estimate <= exact_group_limit:
                try:
                    ranked = timed(
                        f"{name}_rank",
                        f"SELECT {key} AS key, coalesce(sum(share_bani), 0)::text, count(*) OVER ()::int FROM seap.search WHERE {w.sql} AND {key} @@@ pdb.exists() "
                        f"GROUP BY {key} ORDER BY sum(share_bani) DESC NULLS LAST, {key} LIMIT {PAGE} OFFSET 0",
                        w.params,
                    )
                except Exception as e:  # noqa: BLE001 - store.ts falls through to the estimated path on the bucket cap, and so do we
                    if "max_term_agg_buckets" not in str(e):
                        raise
            if ranked is None:
                spec = {"terms": {"field": key, "size": PAGE + 1, "order": {"s": "desc"}}, "aggs": {"s": {"sum": {"field": "share_bani"}}}}
                r = timed(f"{name}_terms", f"SELECT pdb.agg(%s::jsonb) FROM seap.search WHERE {w.sql}", [json.dumps(spec), *w.params])
                buckets = (r[0][0] or {}).get("buckets", []) if r else []
                ranked = [(b["key"], 0) for b in buckets if b.get("key") is not None][:PAGE]
            keys = [row[0] for row in ranked]
            if keys:
                timed(
                    f"{name}_stats",
                    f"SELECT key, coalesce(sum(sh), 0)::text, count(*)::int FROM (SELECT {key} AS key, record_code, {_GROUPED} FROM seap.search "
                    f"WHERE {w.sql} AND {key} = ANY(%s::text[]) GROUP BY {key}, record_code) g GROUP BY key",
                    [*w.params, keys],
                )
                _hydrate_entities(timed, name, keys)

        tasks.append(Task(name, "scan", [f"{name}_cardinality", f"{name}_rank", f"{name}_stats", f"{name}_entities", f"{name}_placement"], alternatives=[f"{name}_terms"], run=run_entities))

    # the Records tab: the empty state's page is `store.records` on seap.record (its count is the total's); otherwise the count (from the
    # rollup total when chips-only) and the Top-K page on the index; either way the page is hydrated (entities, placement, source files)
    def run_records(timed):
        if w.empty:
            rows = timed("records_page", f"SELECT authority_key, source_file_id, winners, {RECORD_COLUMNS} FROM seap.record ORDER BY {RECORD_TABLE_ORDER} LIMIT {PAGE} OFFSET 0", [])
        else:
            if not plan:
                if w.winner_side:
                    timed("records_count", f"SELECT count(DISTINCT record_code)::int FROM seap.search WHERE {w.sql}", w.params)
                else:
                    timed("records_count", f"SELECT count(*)::int FROM seap.search WHERE {w.sql} AND winner_position = 1", w.params)
            if w.winner_side:
                codes = timed("records_page", f"SELECT record_code FROM seap.search WHERE {w.sql} GROUP BY record_code, value_bani, award_date ORDER BY {RECORD_ORDER} LIMIT {PAGE} OFFSET 0", w.params)
            else:
                codes = timed("records_page", f"SELECT record_code FROM seap.search WHERE {w.sql} AND winner_position = 1 ORDER BY {RECORD_ORDER} LIMIT {PAGE} OFFSET 0", w.params)
            rows = timed("records_hydrate", f"SELECT authority_key, source_file_id, winners, {RECORD_COLUMNS} FROM seap.record WHERE code = ANY(%s)", [[r[0] for r in codes]]) if codes else []
        keys = {r[0] for r in rows if r[0]}
        for winner_list in (r[2] for r in rows):
            keys.update(x.get("key") for x in (winner_list or []) if isinstance(x, dict) and x.get("key"))
        if keys:
            _hydrate_entities(timed, "records", sorted(keys))
        files = sorted({r[1] for r in rows})
        if files:
            timed("records_files", "SELECT id, via, fetched_at FROM seap.source_file WHERE id = ANY(%s)", [files])

    if w.empty:
        names, replaced = ["records_page", "records_entities", "records_placement", "records_files"], []
    else:
        names = ["records_page", "records_hydrate", "records_entities", "records_placement", "records_files"]
        replaced = [] if plan else ["records_count"]
    # chips-only: the page itself is always the Top-K query on the index (store.ts `searchRecords`), so the task is "mixed", not "rollup"
    tasks.append(Task("records", ("rollup" if w.empty else "mixed") if plan else "scan", [*replaced, *names], run=run_records))

    # Go-to: a text query's exact entity, by CUI or by folded name
    if w.q_folded:
        cui = bool(re.fullmatch(r"\d{2,10}", w.q_folded))
        sql = "SELECT key FROM core.entity WHERE key = %s AND identity = 'CUI' LIMIT 2" if cui else "SELECT key FROM core.entity WHERE name_folded = %s AND name_folded <> '' LIMIT 2"
        tasks.append(Task("goto", "scan", ["go_to"], run=lambda timed, s=sql, q=w.q_folded: timed("go_to", s, [q])))

    # dataThrough: asked by every MainScreen request, not cached by the API, and a scan of seap.record (store.ts: no index serves it);
    # a known cost the whole keystroke pays, judged in every state
    data_through = (
        "SELECT kind, max(d)::text AS date FROM (SELECT kind, max(published_on) AS d FROM seap.record WHERE via IS DISTINCT FROM 'CRAWL' GROUP BY kind "
        "UNION ALL SELECT kind, through FROM seap.crawl_state) x GROUP BY kind ORDER BY kind"
    )
    tasks.append(Task("data_through", "record", ["data_through"], run=lambda timed, s=data_through: timed("data_through", s, [])))
    return tasks


def _hydrate_entities(timed: Callable, prefix: str, keys: list[str]) -> None:
    """`entitiesOf`: the entities of a page of keys, then their placement (two reads of the core tables, as store.ts does)."""
    if not keys:
        return
    timed(f"{prefix}_entities", "SELECT * FROM core.entity WHERE key = ANY(%s)", [keys])
    timed(
        f"{prefix}_placement",
        "SELECT p.entity_key, p.county_iso, c.name, p.uat_siruta, u.name, p.village_siruta, p.national, p.placed_by "
        "FROM core.placement p LEFT JOIN core.county c ON c.iso = p.county_iso LEFT JOIN core.uat u ON u.siruta = p.uat_siruta WHERE p.entity_key = ANY(%s)",
        [keys],
    )


# ---- statistics, verdicts, rendering ---------------------------------------------------------------------------------------------


def percentile(values: list[float], pct: float) -> float:
    """Nearest-rank percentile (no interpolation: a p95 of 5 runs is the largest)."""
    if not values:
        return float("nan")
    ordered = sorted(values)
    rank = max(1, -(-len(ordered) * pct // 100))  # ceil
    return ordered[int(rank) - 1]


def summarize(values: list[float]) -> dict:
    if not values:
        return {"n": 0, "median": None, "p95": None, "max": None}
    return {"n": len(values), "median": round(statistics.median(values), 2), "p95": round(percentile(values, 95), 2), "max": round(max(values), 2)}


def verdict(entry: dict, threshold_ms: float, *, strict_maps: bool = False) -> tuple[bool, str]:
    """Pass/fail of one query. A text query: the whole keystroke (every task). An empty or chips-only state: the rollup-served tasks,
    which must really be served by the rollup (`entry["rollup_judged"]` names them); the map scan of those states is answered by the
    API's warmed cache and is judged only with `strict_maps` (it is always reported). The judged number is the p95 of the warm runs,
    and the cold run too. An API-mode entry may also carry `expect_cached` (the empty state and the 2-character prefixes), which
    must be answered by the warmed cache (`cached_ms`), and `scan_ok` (False: the first request scanned `seap.search` more than its
    map and Top-K page need, or a request that had to miss the cache did not read the rollup tables)."""
    state = entry["state"]
    judged = entry["rollup_wall_ms"] if (state in ("empty", "chips") and not strict_maps) else entry["wall_ms"]
    reasons: list[str] = []
    if state in ("empty", "chips") and entry.get("serving") and any(s == "scan" for t, s in entry["serving"].items() if t in entry.get("rollup_judged", ())):
        reasons.append("a part of an empty/chips-only state that the rollup should serve is a scan")
    if entry.get("rollup_verified") is False:
        reasons.append("EXPLAIN shows the scan, not the rollup")
    if entry.get("expect_cached") and entry.get("from_warmed_cache") is False:
        reasons.append(f"not from the warmed cache: first request {entry['wall_ms']['cold']:.0f} ms > {entry['cached_ms']:.0f} ms")
    if entry.get("scan_ok") is False:
        sc = entry["scans"]
        if sc["search"] > sc["allowed"]:
            reasons.append(f"the first request scanned seap.search {sc['search']} time(s), more than the {sc['allowed']} its map and Top-K page need (measured in SQL mode)")
        if sc["need_rollup"] and (sc["cube"] < 1 or sc["entity"] < 2):
            reasons.append(f"the rollup tables were barely read (cube {sc['cube']}, entity {sc['entity']}): a cached answer, or the API did not use the rollup (restart the api, wait for `cache warmed`, run again)")
    for label, value in (("cold", judged.get("cold")), ("warm p95", judged.get("p95"))):
        if value is not None and value > threshold_ms:
            reasons.append(f"{label} {value:.0f} ms > {threshold_ms:.0f} ms")
    return (not reasons), "; ".join(reasons)


def render_table(report: dict) -> str:
    """A short human table: one line per query."""
    rows = [("query", "state", "cold", "median", "p95", "max", "result")]
    for q in report["queries"]:
        w = q["rollup_wall_ms"] if (q["state"] in ("empty", "chips") and not report.get("strictMaps")) else q["wall_ms"]
        warm = {True: " [warmed cache: yes]", False: " [warmed cache: NO]"}.get(q.get("from_warmed_cache"), "")
        rows.append((q["label"], q["state"], _ms(w.get("cold")), _ms(w.get("median")), _ms(w.get("p95")), _ms(w.get("max")), ("PASS" if q["pass"] else "FAIL " + q["reason"]) + warm))
    widths = [max(len(r[i]) for r in rows) for i in range(len(rows[0]) - 1)]
    lines = ["  ".join(c.ljust(widths[i]) for i, c in enumerate(r[:-1])) + "  " + r[-1] for r in rows]
    host = report["host"]
    db_cpus = report.get("dbCpusDeclared")
    cpus = f"database {db_cpus:g} vCPU (declared), client host {host['cpus']}" if db_cpus else f"host {host['cpus']} usable CPU(s)"
    head = (f"keystroke benchmark ({report['mode']}): threshold {report['thresholdMs']:.0f} ms, {report['repetitions']} warm run(s) per query, {cpus}"
            + (f" (target {TARGET_VCPUS})" if (db_cpus or host["cpus"]) != TARGET_VCPUS else ""))
    s = report["summary"]
    return "\n".join([head, *lines, f"{s['passed']}/{s['total']} passed" + ("" if s["failed"] == 0 else f", {s['failed']} FAILED")])


def _ms(v) -> str:
    return "-" if v is None else f"{v:.0f} ms"


def cpu_budget() -> dict:
    """CPUs this process may use: the affinity mask, capped by the cgroup quota (a Compose `cpus:` limit). The spec's target is 8 vCPU."""
    try:
        affinity = len(os.sched_getaffinity(0))
    except AttributeError:
        affinity = os.cpu_count() or 1
    quota = None
    try:
        parts = Path("/sys/fs/cgroup/cpu.max").read_text().split()
        if parts[0] != "max":
            quota = int(parts[0]) / int(parts[1])
    except (OSError, ValueError, IndexError):
        pass
    cpus = min(affinity, quota) if quota else affinity
    return {"cpus": round(cpus, 2) if quota else affinity, "affinity": affinity, "cgroupQuota": quota, "logical": os.cpu_count()}


# ---- the query list ----------------------------------------------------------------------------------------------------------------


def load_queries(path: Path | str | None = None) -> list[dict]:
    """The queries: a JSON list of `{"label": ..., "filter": {RecordFilter fields}}` (default: bench_queries.json next to this file).
    A bare string is a text query. Raises ValueError on anything else."""
    raw = json.loads(Path(path or DEFAULT_QUERIES).read_text(encoding="utf-8"))
    if not isinstance(raw, list) or not raw:
        raise ValueError("the query file must be a non-empty JSON list")
    out = []
    for item in raw:
        if isinstance(item, str):
            item = {"label": item, "filter": {"q": item}}
        if not isinstance(item, dict) or not isinstance(item.get("filter"), dict):
            raise ValueError(f"bad query entry (want a string or {{label, filter}}): {item!r}")
        out.append({"label": item.get("label") or json.dumps(item["filter"], ensure_ascii=False, sort_keys=True), "filter": item["filter"]})
    labels = [q["label"] for q in out]
    if len(set(labels)) != len(labels):
        raise ValueError("query labels must be unique")
    return out


# ---- running it --------------------------------------------------------------------------------------------------------------------


def _json_default(o):
    return str(o)


def run_keystroke(conns: list, f: dict, *, rollup: bool = True) -> dict:
    """Run one keystroke over the connections (one per task, in parallel). Returns wall time, per-task and per-statement times (ms),
    and the SQL each statement ran (for the EXPLAIN of the rollup-served ones)."""
    tasks = plan_tasks(f, rollup=rollup)
    statements: dict[str, float] = {}
    sqls: dict[str, tuple[str, list]] = {}
    task_ms: dict[str, float] = {}

    def run_task(i: int) -> None:
        task = tasks[i]
        conn = conns[i % len(conns)]
        t0 = time.perf_counter()

        def timed(name: str, sql: str, params: list):
            s0 = time.perf_counter()
            try:
                rows = conn.execute(sql, params).fetchall()
            except Exception:
                conn.rollback()
                raise
            finally:
                statements[name] = (time.perf_counter() - s0) * 1000
                sqls[name] = (sql, params)
            conn.rollback()  # end the implicit transaction: the next statement starts clean
            return rows

        task.run(timed)
        task_ms[task.name] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        for fut in [pool.submit(run_task, i) for i in range(len(tasks))]:
            fut.result()
    wall = (time.perf_counter() - t0) * 1000
    judged_names = [t.name for t in tasks if t.judged_in_rollup_state]
    judged = [task_ms[n] for n in judged_names if n in task_ms]
    return {
        "wall": wall, "rollupWall": max(judged) if judged else wall, "tasks": task_ms, "statements": statements, "sqls": sqls,
        "serving": {t.name: t.serving for t in tasks}, "rollupJudged": judged_names, "mustReadRollup": [n for t in tasks for n in t.rollup_statements],
    }


def verify_rollup(conn, sqls: dict[str, tuple[str, list]], must_read_rollup: list[str]) -> bool:
    """EXPLAIN the exact SQL the rollup-served statements of an empty/chips-only keystroke ran (`total`, the entity tabs' rank): each
    must read a rollup table and never `seap.search` (its BM25 index). False when there is nothing to check. This only proves that the
    SQL this module wrote reads the rollup; that the API does the same is guaranteed by the parity test (`rollup_plan` is the API's) and
    by the scan counters of API mode (`judge_scans`)."""
    import psycopg

    if not must_read_rollup:
        return False
    for name in must_read_rollup:
        sql, params = sqls[name]
        text = "\n".join(r[0] for r in psycopg.ClientCursor(conn).execute("EXPLAIN " + sql, params).fetchall())  # EXPLAIN takes no bind parameters
        conn.rollback()
        if "rollup_" not in text or "seap.search" in text or "search_bm25" in text:
            return False
    return True


# What an uncached API request may do to `seap.search` in a state the rollup serves: the rollup takes the total, the Records count and the
# entity tabs, what is left is the Money-lens map and, for the chips-only state, the Top-K Records page on the index. `pg_stat_user_tables`
# counts scan *nodes* (every index scan of a BitmapAnd, every parallel worker), not statements, so the allowance is measured, not a
# constant: `calibrate_scans` runs the map and the Records page of the state in SQL mode first and counts what they do.
SCAN_STATES = ("empty", "chips")
SCAN_TABLES = ("seap.search", "seap.rollup_cube", "seap.rollup_entity")
STATS_LAG_S = 12.0  # an idle session reports its statistics to others after up to 10 s (PostgreSQL 18): wait that long after an API request


def scan_counts(conn) -> dict[str, int]:
    """Scans (sequential + index, BM25 included) per table since the statistics were last reset: `pg_stat_user_tables`."""
    rows = conn.execute(
        "SELECT schemaname || '.' || relname, coalesce(seq_scan, 0) + coalesce(idx_scan, 0) FROM pg_stat_user_tables WHERE schemaname || '.' || relname = ANY(%s)", [list(SCAN_TABLES)]
    ).fetchall()
    conn.rollback()
    return {name: int(n) for name, n in rows}


def calibrate_scans(conn, f: dict) -> int:
    """The scans of `seap.search` the map and the Records page of filter `f` cost on this database, run once in SQL mode (the work an
    API miss of an empty or chips-only state cannot avoid). Every statement forces the session's statistics out
    (`pg_stat_force_next_flush`) so they are visible at once to this connection and to others, with no wait."""

    def timed(name: str, sql: str, params: list):
        try:
            conn.execute("SELECT pg_stat_force_next_flush()").fetchall()
            rows = conn.execute(sql, params).fetchall()
        finally:
            conn.rollback()
        return rows

    before = scan_counts(conn)
    for task in plan_tasks(f):
        if task.name in ("map", "records"):
            task.run(timed)
    return scan_counts(conn).get("seap.search", 0) - before.get("seap.search", 0)


def judge_scans(state: str, before: dict[str, int], after: dict[str, int], allowed: int, *, need_rollup: bool = False) -> dict | None:
    """What one uncached API request did to the scan counters of `seap.search` and the rollup tables: `search` must not exceed
    `allowed` (from `calibrate_scans`); with `need_rollup` (a request that had to miss the cache) the rollup tables must have been
    read (`rollup_cube` at least once, `rollup_entity` at least twice: the two entity tabs). None for a state with no budget (text
    queries scan by design)."""
    if state not in SCAN_STATES:
        return None
    delta = {t.split(".")[1].removeprefix("rollup_") if t != "seap.search" else "search": after.get(t, 0) - before.get(t, 0) for t in SCAN_TABLES}
    ok = delta["search"] <= allowed and (not need_rollup or (delta["cube"] >= 1 and delta["entity"] >= 2))
    return {"search": delta["search"], "cube": delta["cube"], "entity": delta["entity"], "allowed": allowed, "need_rollup": need_rollup, "ok": ok}


def graph_facts(conn) -> dict:
    """What the benchmark ran on: row counts, server and pg_search versions, shared_buffers (a benchmark on a toy load proves nothing)."""
    facts: dict = {}
    for key, sql in (
        ("searchRows", "SELECT count(*) FROM seap.search"),
        ("records", "SELECT count(*) FROM seap.record"),
        ("server", "SHOW server_version"),
        ("sharedBuffers", "SHOW shared_buffers"),
        ("maxParallelWorkersPerGather", "SHOW max_parallel_workers_per_gather"),
        ("pgSearch", "SELECT extversion FROM pg_extension WHERE extname = 'pg_search'"),
    ):
        try:
            facts[key] = conn.execute(sql).fetchone()[0]
        except Exception:  # noqa: BLE001 - a missing table or extension is a fact too
            conn.rollback()
            facts[key] = None
    conn.rollback()
    return facts


def run_sql(db_url: str, queries: list[dict], *, repetitions: int = 5, threshold_ms: float = DEFAULT_THRESHOLD_MS, rollup: bool = True,
            strict_maps: bool = False, db_cpus: float | None = None, say: Callable[[str], None] = lambda s: None) -> dict:
    """Benchmark `queries` straight against the database. The first run of each query is `cold` (nothing of it was run on this
    connection set; for a cold buffer cache restart the database first), the next `repetitions` are warm."""
    import psycopg

    conns = [psycopg.connect(db_url, autocommit=False) for _ in range(8)]  # the API's pool is 8 (main.ts)
    try:
        facts = graph_facts(conns[0])
        entries = []
        for q in queries:
            f = q["filter"]
            state = state_of(f)
            cold = run_keystroke(conns, f, rollup=rollup)
            warm = [run_keystroke(conns, f, rollup=rollup) for _ in range(repetitions)]
            runs = [cold, *warm]
            names = sorted({n for r in runs for n in r["statements"]})
            entry = {
                "label": q["label"], "filter": f, "state": state, "serving": cold["serving"], "rollup_judged": cold["rollupJudged"],
                "wall_ms": {"cold": round(cold["wall"], 2), **summarize([r["wall"] for r in warm])},
                "rollup_wall_ms": {"cold": round(cold["rollupWall"], 2), **summarize([r["rollupWall"] for r in warm])},
                "tasks": {t: {"cold": round(cold["tasks"][t], 2), **summarize([r["tasks"][t] for r in warm if t in r["tasks"]])} for t in cold["tasks"]},
                "statements": {n: {"cold": round(cold["statements"].get(n, 0), 2), **summarize([r["statements"][n] for r in warm if n in r["statements"]])} for n in names},
            }
            if state in ("empty", "chips"):
                entry["rollup_verified"] = verify_rollup(conns[0], cold["sqls"], cold["mustReadRollup"]) if rollup else False
                entry["rollup_checked"] = cold["mustReadRollup"]
            entry["pass"], entry["reason"] = verdict(entry, threshold_ms, strict_maps=strict_maps)
            entries.append(entry)
            say(f"{q['label']}: cold {cold['wall']:.0f} ms, warm median {entry['wall_ms']['median']} ms {'PASS' if entry['pass'] else 'FAIL'}")
        return _report("sql", entries, repetitions, threshold_ms, strict_maps, {"graph": facts, "dbCpusDeclared": db_cpus})
    finally:
        for c in conns:
            c.close()


def api_request(url: str, op_id: str, filter_: dict, timeout: float = 60.0) -> tuple[float, dict]:
    body = json.dumps({"id": op_id, "variables": {"filter": filter_}}).encode()
    req = urllib.request.Request(url, data=body, headers={"content-type": "application/json"}, method="POST")
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - the operator's own API URL
        payload = json.loads(resp.read())
    ms = (time.perf_counter() - t0) * 1000
    if payload.get("errors"):
        raise RuntimeError(f"the API answered with errors: {payload['errors'][0].get('message')}")
    return ms, payload


def main_screen_id(persisted_path: Path | str) -> str:
    ops = json.loads(Path(persisted_path).read_text())["operations"]
    for op in ops:
        if op["name"] == "MainScreen":
            return op["sha256"]
    raise ValueError("no MainScreen operation in the persisted-query file")


def expect_cached(f: dict) -> bool:
    """Is this state one the API's cache warms after each load (`cache.ts` warm): the empty state and `{q: <2-character prefix>}`?"""
    toks = tokens(f.get("q") or "")
    if any(v is not None and v != "" and v != [] for k, v in f.items() if k != "q"):
        return False
    return not toks or (len(toks) == 1 and len(toks[0]) == 2)


DEFAULT_CACHED_MS = 50.0


def run_api(url: str, op_id: str, queries: list[dict], *, repetitions: int = 5, threshold_ms: float = DEFAULT_THRESHOLD_MS, cached_ms: float = DEFAULT_CACHED_MS,
            db_url: str | None = None, say: Callable[[str], None] = lambda s: None) -> dict:
    """Benchmark the persisted MainScreen operation of a running API. `cold` = the first request (a miss of the API's result cache
    unless it was warmed), the repeats are cache hits. Judged on both against `threshold_ms`. The states the cache warms (the empty
    state, the 2-character prefixes: `expect_cached`) must answer their *first* request within `cached_ms`, else the cache was not
    warmed yet (read `docker compose logs api | grep 'cache warmed'` before running this) and the entry fails. With `db_url`, the
    first request of an empty or chips-only state is also checked against the scan counters of the database (`judge_scans`): it must
    not scan `seap.search` more than the map and the Top-K page cost in SQL mode (`calibrate_scans`, run before the request), and a
    request that must miss the cache (not `expect_cached`) must have read the rollup tables. Only the first API-mode run after a cache
    flush measures misses: to repeat it, restart the api and wait for `cache warmed`."""
    conn = None
    if db_url:
        import psycopg

        conn = psycopg.connect(db_url, autocommit=False)
    entries = []
    try:
        for q in queries:
            f = q["filter"]
            state = state_of(f)
            check = conn is not None and state in SCAN_STATES
            allowed = calibrate_scans(conn, f) if check else 0
            before = scan_counts(conn) if check else None
            first, _ = api_request(url, op_id, f)
            scans = None
            if before is not None:
                time.sleep(STATS_LAG_S)
                scans = judge_scans(state, before, scan_counts(conn), allowed, need_rollup=not expect_cached(f))
            rest = [api_request(url, op_id, f)[0] for _ in range(repetitions)]
            w = {"cold": round(first, 2), **summarize(rest)}
            entry = {"label": q["label"], "filter": f, "state": state, "serving": {}, "rollup_judged": [], "wall_ms": w, "rollup_wall_ms": w, "tasks": {}, "statements": {}}
            if expect_cached(f):
                entry.update(expect_cached=True, cached_ms=cached_ms, from_warmed_cache=first <= cached_ms)
            if scans is not None:
                entry.update(scans=scans, scan_ok=scans["ok"])
            entry["pass"], entry["reason"] = verdict(entry, threshold_ms, strict_maps=True)
            entries.append(entry)
            warmed = "" if "from_warmed_cache" not in entry else (", from the warmed cache" if entry["from_warmed_cache"] else ", NOT from the warmed cache")
            say(f"{q['label']}: first {first:.0f} ms, repeat median {w['median']} ms{warmed} {'PASS' if entry['pass'] else 'FAIL'}")
    finally:
        if conn is not None:
            conn.close()
    return _report("api", entries, repetitions, threshold_ms, True, {"url": url, "cachedMs": cached_ms, "scanCheck": bool(db_url)})


def _report(mode: str, entries: list[dict], repetitions: int, threshold_ms: float, strict_maps: bool, extra: dict) -> dict:
    failed = [e for e in entries if not e["pass"]]
    return {
        "mode": mode, "thresholdMs": threshold_ms, "repetitions": repetitions, "strictMaps": strict_maps,
        "targetVcpus": TARGET_VCPUS, "host": cpu_budget(), "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **extra, "queries": entries, "summary": {"total": len(entries), "passed": len(entries) - len(failed), "failed": len(failed), "failedLabels": [e["label"] for e in failed]},
    }
