"""The ONRC search latency benchmark (#176): the same gate as `bench.py` (spec #37: under about 500 ms on 8 vCPU), for ONRC's search.

One keystroke of ONRC search is an OnrcFilter (the URL state) and everything the screen shows from its matching set: the match count, the Organisations
tab (the Top-K page and its rows' details) and the count lens. The API (`explorer/packages/api/src/onrcSearch.ts`) answers it with those statements on
pooled connections; this module issues the same statements in the same shape (`build_where`: every folded token but the last `&&&`, the last a `pdb.regex`
prefix, chips as plain predicates), times each statement and the whole keystroke in parallel, and checks it against the threshold. SQL mode only: it needs
a rebuilt graph. A change to `onrcSearch.ts` needs the same change here; `tests/test_bench_onrc.py` compares `build_where` with the API's own
`buildOnrcWhere` over every shipped query (the vitest `explorer/packages/api/test/benchOnrcParity.test.ts` writes the expectations into
`tests/fixtures/bench_onrc_parity.json`; `UPDATE_BENCH_PARITY=1 npm test` there rewrites it), the statement sequences are pinned by that test file only.

Fixtures are for the shape and the code path; the national figure (the real register: millions of registrations) is the operator's, ticket #187.
"""
from __future__ import annotations

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .bench import DEFAULT_THRESHOLD_MS, PAGE, _hydrate_entities, _ms, _regex_escape, cpu_budget, summarize
from .fold import tokens

DEFAULT_QUERIES = Path(__file__).with_name("bench_onrc_queries.json")


@dataclass
class Where:
    sql: str  # a predicate over onrc.search with `%s` placeholders, never empty
    params: list
    text: bool  # the query has text (BM25 scores mean something)
    q_folded: str | None


def build_where(f: dict) -> Where:
    """The OnrcFilter (a dict with the API's field names) as a WHERE over onrc.search, as `buildOnrcWhere` builds it."""
    params: list = []
    preds: list[str] = []

    def bind(value, cast: str = "") -> str:
        params.append(value)
        return f"%s{cast}"

    toks = tokens(f.get("q") or "")
    if toks:
        if len(toks) > 1:
            preds.append(f"doc &&& {bind(' '.join(toks[:-1]), '::text')}")
        preds.append(f"(doc @@@ pdb.regex({bind(_regex_escape(toks[-1]) + '.*', '::text')}) OR doc ||| {bind(toks[-1], '::text')})")
    if f.get("status"):
        preds.append(f"statuses @@@ pdb.term_set({bind([str(s) for s in f['status']], '::text[]')})")
    if f.get("caen"):
        preds.append(f"caen @@@ pdb.regex({bind(_regex_escape(f['caen'].strip()) + '.*', '::text')})")
    if f.get("county"):
        preds.append(f"area = {bind(f['county'])}")
    if f.get("registeredFrom"):
        preds.append(f"registration_date >= {bind(f['registeredFrom'], '::date')}")
    if f.get("registeredTo"):
        preds.append(f"registration_date <= {bind(f['registeredTo'], '::date')}")
    if f.get("seapCounterparty") is not None:
        preds.append(f"seap_counterparty = {bind(f['seapCounterparty'])}")
    if not toks:
        preds.insert(0, "id @@@ pdb.all()")
    return Where(" AND ".join(preds), params, bool(toks), " ".join(toks) if toks else None)


def _count(timed: Callable, name: str, w: Where) -> int:
    return timed(name, f"SELECT count(*)::int AS n FROM onrc.search WHERE {w.sql}", w.params)[0][0]


def organisations(timed: Callable, w: Where) -> None:
    """The Organisations tab: the count, the Top-K page, then the page's rows (registration, statuses, CAEN, aliases) and their entities."""
    total = _count(timed, "organisations_count", w)
    if total == 0:
        return
    order = f"{'pdb.score(id) DESC, ' if w.text else ''}registration_date DESC NULLS LAST, id"
    regs = [r[0] for r in timed("organisations_page", f"SELECT reg_no FROM onrc.search WHERE {w.sql} ORDER BY {order} LIMIT {PAGE} OFFSET 0", w.params)]
    if not regs:
        return
    rows = timed(
        "organisations_rows",
        "SELECT r.reg_no, r.name, r.cui, r.legal_form, r.registration_date::text AS registration_date, r.county_name, r.locality, s.seap_counterparty "
        "FROM onrc.registration r JOIN onrc.search s ON s.reg_no = r.reg_no WHERE r.reg_no = ANY(%s)", [regs])
    timed("organisations_statuses",
          "SELECT sp.reg_no, sp.code, n.name FROM onrc.status_span sp JOIN onrc.registration r ON r.reg_no = sp.reg_no AND sp.last_seen = r.snapshot_date "
          "LEFT JOIN onrc.status_name n ON n.code = sp.code WHERE sp.reg_no = ANY(%s) ORDER BY sp.reg_no, sp.code", [regs])
    timed("organisations_caen", "SELECT reg_no, code, version FROM onrc.caen WHERE reg_no = ANY(%s) ORDER BY reg_no, code", [regs])
    timed("organisations_aliases",
          "SELECT n.reg_no, n.name FROM onrc.name_span n JOIN onrc.registration r ON r.reg_no = n.reg_no AND n.name <> r.name WHERE n.reg_no = ANY(%s) "
          "GROUP BY n.reg_no, n.name ORDER BY n.reg_no, max(n.last_seen) DESC, n.name", [regs])
    _hydrate_entities(timed, "organisations", sorted({r[2] for r in rows if r[2]}))


def count_map(timed: Callable, w: Where) -> None:
    timed("map", f"SELECT area, count(*)::int AS n FROM onrc.search WHERE {w.sql} GROUP BY area ORDER BY area", w.params)


TASKS = (("count", lambda timed, w: _count(timed, "count", w)), ("organisations", organisations), ("map", count_map))


def run_keystroke(conns: list, f: dict) -> dict:
    """One keystroke: its three tasks in parallel, one connection each. Returns the wall time and the per-task and per-statement times (ms)."""
    w = build_where(f)
    statements: dict[str, float] = {}
    task_ms: dict[str, float] = {}

    def run_task(i: int) -> None:
        name, run = TASKS[i]
        conn = conns[i % len(conns)]
        t0 = time.perf_counter()

        def timed(label: str, sql: str, params: list):
            s0 = time.perf_counter()
            try:
                rows = conn.execute(sql, params).fetchall()
            except Exception:
                conn.rollback()
                raise
            finally:
                statements[label] = (time.perf_counter() - s0) * 1000
            conn.rollback()
            return rows

        run(timed, w)
        task_ms[name] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(TASKS)) as pool:
        for fut in [pool.submit(run_task, i) for i in range(len(TASKS))]:
            fut.result()
    return {"wall": (time.perf_counter() - t0) * 1000, "tasks": task_ms, "statements": statements}


def load_queries(path: Path | str | None = None) -> list[dict]:
    """A JSON list of `{"label": ..., "filter": {OnrcFilter fields}}`; a bare string is a text query."""
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
    if len({q["label"] for q in out}) != len(out):
        raise ValueError("query labels must be unique")
    return out


def run_sql(db_url: str, queries: list[dict], *, repetitions: int = 5, threshold_ms: float = DEFAULT_THRESHOLD_MS, db_cpus: float | None = None,
            say: Callable[[str], None] = lambda s: None) -> dict:
    """Benchmark `queries` straight against the database: the first run of each is cold, the next `repetitions` are warm. A query passes when its cold run and its warm p95 are under the threshold."""
    import psycopg

    conns = [psycopg.connect(db_url, autocommit=False) for _ in range(len(TASKS))]
    try:
        registrations = conns[0].execute("SELECT count(*) FROM onrc.search").fetchone()[0]
        conns[0].rollback()
        entries = []
        for q in queries:
            cold = run_keystroke(conns, q["filter"])
            warm = [run_keystroke(conns, q["filter"]) for _ in range(repetitions)]
            entry = {
                "label": q["label"], "filter": q["filter"],
                "wall_ms": {"cold": round(cold["wall"], 2), **summarize([r["wall"] for r in warm])},
                "tasks": {t: {"cold": round(cold["tasks"][t], 2), **summarize([r["tasks"][t] for r in warm if t in r["tasks"]])} for t in cold["tasks"]},
                "statements": {n: {"cold": round(cold["statements"].get(n, 0), 2), **summarize([r["statements"][n] for r in warm if n in r["statements"]])} for n in sorted({n for r in [cold, *warm] for n in r["statements"]})},
            }
            reasons = [f"{label} {value:.0f} ms > {threshold_ms:.0f} ms" for label, value in (("cold", entry["wall_ms"]["cold"]), ("warm p95", entry["wall_ms"]["p95"])) if value is not None and value > threshold_ms]
            entry["pass"], entry["reason"] = not reasons, "; ".join(reasons)
            entries.append(entry)
            say(f"{q['label']}: cold {cold['wall']:.0f} ms, warm median {entry['wall_ms']['median']} ms {'PASS' if entry['pass'] else 'FAIL'}")
        failed = sum(1 for e in entries if not e["pass"])
        return {"mode": "sql", "thresholdMs": threshold_ms, "repetitions": repetitions, "registrations": registrations, "dbCpusDeclared": db_cpus, "host": cpu_budget(),
                "queries": entries, "summary": {"total": len(entries), "passed": len(entries) - failed, "failed": failed}}
    finally:
        for c in conns:
            c.close()


def render_table(report: dict) -> str:
    rows = [("query", "cold", "median", "p95", "max", "result")]
    for q in report["queries"]:
        w = q["wall_ms"]
        rows.append((q["label"], _ms(w.get("cold")), _ms(w.get("median")), _ms(w.get("p95")), _ms(w.get("max")), "PASS" if q["pass"] else "FAIL " + q["reason"]))
    widths = [max(len(r[i]) for r in rows) for i in range(len(rows[0]) - 1)]
    lines = ["  ".join(c.ljust(widths[i]) for i, c in enumerate(r[:-1])) + "  " + r[-1] for r in rows]
    s = report["summary"]
    head = f"ONRC search benchmark (sql, {report['registrations']} registrations indexed): threshold {report['thresholdMs']:.0f} ms, {report['repetitions']} warm run(s) per query"
    return "\n".join([head, *lines, f"{s['passed']}/{s['total']} passed" + ("" if s["failed"] == 0 else f", {s['failed']} FAILED")])
