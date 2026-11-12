"""The Release 1 acceptance verbs (#91): `bench`, `check-fixture`, `check-week`. Wired into cli.py like placement_cli (two call sites)."""
from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

from .archive import Archive

VERBS = ("bench", "check-fixture", "check-week")


def add_parsers(sub) -> None:
    from .acceptance import ACCEPTED, BATCH_DIR, DEFAULT_BATCHES, REFERENCE_AUTHORITY, REFERENCE_QUARTER
    from .bench import DEFAULT_CACHED_MS, DEFAULT_QUERIES, DEFAULT_THRESHOLD_MS

    b = sub.add_parser("bench", help="the keystroke latency benchmark (#91): the main screen's statements per query against a database (default) or a running API; exit 1 if any query is over the threshold")
    b.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of a rebuilt graph (env DATABASE_URL)")
    b.add_argument("--api-url", help="benchmark the API instead: its /graphql URL (needs --operation-id or --persisted-queries)")
    b.add_argument("--operation-id", help="the sha256 of the MainScreen persisted operation (API mode)")
    b.add_argument("--persisted-queries", help="the contract's persisted-queries.json (API mode; reads the MainScreen id)")
    b.add_argument("--queries", default=str(DEFAULT_QUERIES), help="JSON list of {label, filter} (default: the shipped Romanian procurement list)")
    b.add_argument("--repetitions", type=int, default=5, help="warm runs per query after the cold one (default 5)")
    b.add_argument("--threshold-ms", type=float, default=DEFAULT_THRESHOLD_MS, help=f"pass/fail per query, p95 and cold (default {DEFAULT_THRESHOLD_MS:.0f})")
    b.add_argument("--cached-ms", type=float, default=DEFAULT_CACHED_MS, help=f"API mode: the empty state and the 2-character prefixes must answer their first request within this (default {DEFAULT_CACHED_MS:.0f}): the cache must be warmed")
    b.add_argument("--no-scan-check", action="store_true", help="API mode: do not read the scan counters of --db / DATABASE_URL around the first request of the empty and chips-only states")
    b.add_argument("--strict-maps", action="store_true", help="judge the Money lens scans of the empty and chips-only states too (the API serves them from its warmed cache)")
    b.add_argument("--no-rollup", action="store_true", help="force the scan for the empty and chips-only states (a comparison; they then fail the rollup check)")
    b.add_argument("--db-cpus", type=float, default=float(os.environ["BENCH_DB_CPUS"]) if os.environ.get("BENCH_DB_CPUS") else None,
                   help="the vCPUs the database may use (compose.yaml: `cpus: 8` on db; env BENCH_DB_CPUS), recorded in the report: the host's own count says nothing about a capped container")
    b.add_argument("--only", action="append", help="only queries whose label contains this text (repeatable)")
    b.add_argument("--json", dest="json_out", help="write the machine-readable report here")
    f = sub.add_parser("check-fixture", help="the validation fixture (#91): #5's measurement again (Brasov, 2026Q3: crawl DAs in the graph, bulk contracts in the crawl) plus a wider crawl-to-graph line; exit 1 above the allowed misses")
    f.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of the rebuilt graph (env DATABASE_URL)")
    f.add_argument("--batch", action="append", help=f"a crawl batch JSON (repeatable; default {', '.join(DEFAULT_BATCHES)} in {BATCH_DIR})")
    f.add_argument("--quarter", default=REFERENCE_QUARTER, help=f"the quarter of #5's measurement (default {REFERENCE_QUARTER}; 'all' = every quarter the graph holds a bulk file for)")
    f.add_argument("--authority", default=REFERENCE_AUTHORITY, help=f"the CUI of the authority of #5's measurement (default {REFERENCE_AUTHORITY}, Municipiul Brasov; 'all' = every batch)")
    f.add_argument("--da-state", default=ACCEPTED, help=f"only batch DAs in this state (default '{ACCEPTED}'; '' = all)")
    f.add_argument("--allow-missing-da", type=int, default=0, help="crawl DAs of the scope that may be missing from the graph (default 0: #5 measured 152/152)")
    f.add_argument("--allow-missing-contracts", type=int, default=1, help="bulk contracts of the scope that may be missing from the batch (default 1: #5 measured 45/46, CAN1145000~27030 the miss)")
    w = sub.add_parser("check-week", help="the unattended week (#91): seven consecutive UTC days of refresh runs in the ledger with no alert; exit 1 otherwise")
    w.add_argument("--through", type=date.fromisoformat, help="last day of the window, YYYY-MM-DD (default yesterday, UTC)")
    w.add_argument("--days", type=int, default=7)
    w.add_argument("--timer-only", action="store_true", help="count only runs the timer triggered (the unattended week is about those; a hand-started run does not make a day)")
    w.add_argument("--strict", action="store_true", help="also fail on a failed or interrupted run that raised no alert")
    w.add_argument("--ledger", help="the ledger file (default <archive>/refresh-ledger.json)")


def run(archive: Archive, args) -> int | None:
    if args.verb not in VERBS:
        return None
    if args.verb == "check-week":
        from .acceptance import check_week

        ok, lines = check_week(archive.root, through=args.through, days=args.days, strict=args.strict, timer_only=args.timer_only, ledger_path=Path(args.ledger) if args.ledger else None)
        print("\n".join(lines))
        return 0 if ok else 1
    if not args.db and not (args.verb == "bench" and args.api_url):
        print(f"{args.verb}: --db or DATABASE_URL is required", file=sys.stderr)
        return 2
    if args.verb == "check-fixture":
        from .acceptance import BATCH_DIR, DEFAULT_BATCHES, check_fixture

        batches = [Path(p) for p in args.batch] if args.batch else [BATCH_DIR / n for n in DEFAULT_BATCHES]
        missing = [str(p) for p in batches if not p.exists()]
        if missing:
            print(f"check-fixture: batch file(s) not found: {', '.join(missing)}", file=sys.stderr)
            return 2
        ok, lines = check_fixture(args.db, batches, state=args.da_state or None, quarter=None if args.quarter == "all" else args.quarter, authority=None if args.authority == "all" else args.authority, allow_missing_da=args.allow_missing_da, allow_missing_contracts=args.allow_missing_contracts)
        print("\n".join(lines))
        return 0 if ok else 1
    from . import bench

    try:
        queries = bench.load_queries(args.queries)
    except (OSError, ValueError) as e:
        print(f"bench: {e}", file=sys.stderr)
        return 2
    if args.only:
        queries = [q for q in queries if any(t in q["label"] for t in args.only)]
        if not queries:
            print("bench: --only matched no query", file=sys.stderr)
            return 2
    say = lambda line: print(line, file=sys.stderr, flush=True)  # noqa: E731
    if args.api_url:
        op = args.operation_id or (bench.main_screen_id(args.persisted_queries) if args.persisted_queries else None)
        if not op:
            print("bench: API mode needs --operation-id or --persisted-queries", file=sys.stderr)
            return 2
        report = bench.run_api(args.api_url, op, queries, repetitions=args.repetitions, threshold_ms=args.threshold_ms, cached_ms=args.cached_ms, db_url=None if args.no_scan_check else args.db, say=say)
    else:
        report = bench.run_sql(args.db, queries, repetitions=args.repetitions, threshold_ms=args.threshold_ms, rollup=not args.no_rollup, strict_maps=args.strict_maps, db_cpus=args.db_cpus, say=say)
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=1, ensure_ascii=False, default=str) + "\n", encoding="utf-8")
    print(bench.render_table(report))
    return 0 if report["summary"]["failed"] == 0 else 1
