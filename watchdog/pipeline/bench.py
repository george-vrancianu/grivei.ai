"""The keystroke latency benchmark (#91): the performance gate of spec #37, runnable against any database or API.

One keystroke on the main screen is a RecordFilter (the URL state) and everything the screen shows from its matching set. The API
(`explorer/packages/api/src/store.ts`) answers it with several statements on pooled connections, in parallel across the screen's
parts. This module issues the same statements, in the same shape (`buildWhere`: every folded token but the last `&&&`, the last a
`pdb.regex` prefix, chips as plain predicates; `rollupPlan`: the empty and chips-only states from the rollup tables), times each
statement and the whole keystroke, and checks the result against a threshold (default 500 ms, the spec's target on 8 vCPU).

Two modes:
- SQL (`run_sql`): straight to the database, no API needed. The statements below mirror store.ts one for one (a change there needs
  the same change here; `tests/test_bench.py` pins the shape).
- API (`run_api`): POSTs the persisted `MainScreen` operation to a running API and times the whole response. The first request of a
  query is the one that misses the API's result cache (unless warmed), the repeats are cache hits.

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
RECORD_ORDER = "value_bani DESC NULLS LAST, record_code"  # the default Records tab order (VALUE_DESC)


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
    serving: str  # "rollup" or "scan"
    statements: list[str]  # the statement names, in the order they run (the API runs them in sequence within a task)
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
        tasks.append(Task("total", "rollup", ["total"], lambda timed, s=total_sql, p=rparams: timed("total", s, p)))
    else:
        if w.winner_side:
            total_sql = f"SELECT {_TOTAL_FIELDS} FROM (SELECT record_code, {_GROUPED} FROM seap.search WHERE {w.sql} GROUP BY record_code) g"
        else:
            total_sql = (
                "SELECT coalesce(sum(share_bani), 0)::text, (count(*) FILTER (WHERE winner_position = 1))::int, "
                "(count(*) FILTER (WHERE winner_position = 1 AND suspect))::int, (count(*) FILTER (WHERE winner_position = 1 AND value_bani IS NULL))::int, "
                f"coalesce(sum(ceiling_bani) FILTER (WHERE winner_position = 1), 0)::text FROM seap.search WHERE {w.sql}"
            )
        tasks.append(Task("total", "scan", ["total"], lambda timed, s=total_sql, p=w.params: timed("total", s, p)))

    # the Money lens, both sides: always the scan (store.ts `searchMap` has no rollup path; the API's result cache answers the warmed states)
    for side in ("AUTHORITY", "SUPPLIER"):
        area, entity = AREA[side]
        grouped = side == "SUPPLIER" or w.winner_side
        if grouped:
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
        name = f"map_{side.lower()}"

        def run_map(timed, name=name, totals=totals, distinct=distinct, p=w.params):
            timed(f"{name}_totals", totals, p)
            timed(f"{name}_entities", distinct, p)

        tasks.append(Task(name, "scan", [f"{name}_totals", f"{name}_entities"], run_map))

    # the entity tabs
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
            tasks.append(Task(name, "rollup", [f"{name}_rank"], lambda timed, n=name, s=sql, p=[side, *rparams]: timed(f"{n}_rank", s, p)))
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

        tasks.append(Task(name, "scan", [f"{name}_cardinality", f"{name}_rank|{name}_terms", f"{name}_stats"], run_entities))

    # the Records tab: its count from the rollup when chips-only, the page always the Top-K on the index
    def run_records(timed):
        if not plan:
            if w.winner_side:
                timed("records_count", f"SELECT count(DISTINCT record_code)::int FROM seap.search WHERE {w.sql}", w.params)
            else:
                timed("records_count", f"SELECT count(*)::int FROM seap.search WHERE {w.sql} AND winner_position = 1", w.params)
        if w.winner_side:
            codes = timed(
                "records_page", f"SELECT record_code FROM seap.search WHERE {w.sql} GROUP BY record_code, value_bani, award_date ORDER BY {RECORD_ORDER} LIMIT {PAGE} OFFSET 0", w.params
            )
        else:
            codes = timed("records_page", f"SELECT record_code FROM seap.search WHERE {w.sql} AND winner_position = 1 ORDER BY {RECORD_ORDER} LIMIT {PAGE} OFFSET 0", w.params)
        wanted = [r[0] for r in codes]
        if wanted:
            timed("records_hydrate", "SELECT * FROM seap.record WHERE code = ANY(%s)", [wanted])

    tasks.append(Task("records", "rollup" if plan else "scan", ["records_count" if not plan else "(count from total)", "records_page", "records_hydrate"], run_records))
    return tasks


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
    which must really be served by the rollup; the map scans of those states are answered by the API's warmed cache and are judged
    only with `strict_maps` (they are always reported). The judged number is the p95 of the warm runs, and the cold run too."""
    state = entry["state"]
    judged = entry["rollup_wall_ms"] if (state in ("empty", "chips") and not strict_maps) else entry["wall_ms"]
    reasons: list[str] = []
    if state in ("empty", "chips") and entry.get("serving") and any(s != "rollup" for t, s in entry["serving"].items() if not t.startswith("map_")):
        reasons.append("a non-map part of an empty/chips-only state is not served by the rollup")
    if entry.get("rollup_verified") is False:
        reasons.append("EXPLAIN shows the scan, not the rollup")
    for label, value in (("cold", judged.get("cold")), ("warm p95", judged.get("p95"))):
        if value is not None and value > threshold_ms:
            reasons.append(f"{label} {value:.0f} ms > {threshold_ms:.0f} ms")
    return (not reasons), "; ".join(reasons)


def render_table(report: dict) -> str:
    """A short human table: one line per query."""
    rows = [("query", "state", "cold", "median", "p95", "max", "result")]
    for q in report["queries"]:
        w = q["rollup_wall_ms"] if (q["state"] in ("empty", "chips") and not report.get("strictMaps")) else q["wall_ms"]
        rows.append((q["label"], q["state"], _ms(w.get("cold")), _ms(w.get("median")), _ms(w.get("p95")), _ms(w.get("max")), "PASS" if q["pass"] else "FAIL " + q["reason"]))
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
    """Run one keystroke over the connections (one per task, in parallel). Returns wall time, per-task and per-statement times (ms)."""
    tasks = plan_tasks(f, rollup=rollup)
    statements: dict[str, float] = {}
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
            conn.rollback()  # end the implicit transaction: the next statement starts clean
            return rows

        task.run(timed)
        task_ms[task.name] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
        for fut in [pool.submit(run_task, i) for i in range(len(tasks))]:
            fut.result()
    wall = (time.perf_counter() - t0) * 1000
    rollup_tasks = [t.name for t in tasks if t.serving == "rollup" or t.name.startswith("map_")]
    serving = {t.name: t.serving for t in tasks}
    judged = [task_ms[n] for n in task_ms if not n.startswith("map_")]
    return {"wall": wall, "rollupWall": max(judged) if judged else wall, "tasks": task_ms, "statements": statements, "serving": serving, "rollupTasks": rollup_tasks}


def verify_rollup(conn, f: dict) -> bool:
    """EXPLAIN the rollup-served statements of an empty/chips-only state: they must read the rollup tables and not seap.search."""
    import psycopg

    plan = rollup_plan(f)
    if not plan:
        return False
    rwhere, rparams = rollup_where(plan)
    for table, extra in (("seap.rollup_cube", ""), ("seap.rollup_entity", "side = 'AUTHORITY' AND ")):
        text = "\n".join(r[0] for r in psycopg.ClientCursor(conn).execute(f"EXPLAIN SELECT sum(awarded) FROM {table} WHERE {extra}{rwhere}", rparams).fetchall())  # EXPLAIN takes no bind parameters
        conn.rollback()
        if table.split(".")[1] not in text or "seap.search" in text or "search_bm25" in text:
            return False
    return True


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

    conns = [psycopg.connect(db_url, autocommit=False) for _ in range(6)]
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
                "label": q["label"], "filter": f, "state": state, "serving": cold["serving"],
                "wall_ms": {"cold": round(cold["wall"], 2), **summarize([r["wall"] for r in warm])},
                "rollup_wall_ms": {"cold": round(cold["rollupWall"], 2), **summarize([r["rollupWall"] for r in warm])},
                "tasks": {t: {"cold": round(cold["tasks"][t], 2), **summarize([r["tasks"][t] for r in warm if t in r["tasks"]])} for t in cold["tasks"]},
                "statements": {n: {"cold": round(cold["statements"].get(n, 0), 2), **summarize([r["statements"][n] for r in warm if n in r["statements"]])} for n in names},
            }
            if state in ("empty", "chips"):
                entry["rollup_verified"] = verify_rollup(conns[0], f) if rollup else False
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


def run_api(url: str, op_id: str, queries: list[dict], *, repetitions: int = 5, threshold_ms: float = DEFAULT_THRESHOLD_MS, say: Callable[[str], None] = lambda s: None) -> dict:
    """Benchmark the persisted MainScreen operation of a running API. `cold` = the first request (a miss of the API's result cache
    unless it was warmed: the 2-character prefixes and the empty state are), the repeats are cache hits. Judged on both."""
    entries = []
    for q in queries:
        f = q["filter"]
        state = state_of(f)
        first, _ = api_request(url, op_id, f)
        rest = [api_request(url, op_id, f)[0] for _ in range(repetitions)]
        w = {"cold": round(first, 2), **summarize(rest)}
        entry = {"label": q["label"], "filter": f, "state": state, "serving": {}, "wall_ms": w, "rollup_wall_ms": w, "tasks": {}, "statements": {}}
        entry["pass"], entry["reason"] = verdict(entry, threshold_ms, strict_maps=True)
        entries.append(entry)
        say(f"{q['label']}: first {first:.0f} ms, repeat median {w['median']} ms {'PASS' if entry['pass'] else 'FAIL'}")
    return _report("api", entries, repetitions, threshold_ms, True, {"url": url})


def _report(mode: str, entries: list[dict], repetitions: int, threshold_ms: float, strict_maps: bool, extra: dict) -> dict:
    failed = [e for e in entries if not e["pass"]]
    return {
        "mode": mode, "thresholdMs": threshold_ms, "repetitions": repetitions, "strictMaps": strict_maps,
        "targetVcpus": TARGET_VCPUS, "host": cpu_budget(), "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **extra, "queries": entries, "summary": {"total": len(entries), "passed": len(entries) - len(failed), "failed": len(failed), "failedLabels": [e["label"] for e in failed]},
    }
