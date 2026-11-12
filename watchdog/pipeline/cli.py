"""pipeline CLI. `python -m pipeline <verb>` from `watchdog/` (or `pipeline <verb>` in the pipeline image)."""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
from types import SimpleNamespace
from datetime import date, datetime, timezone
from pathlib import Path

from .anaf import DEFAULT_STATUS_NAME as ANAF_STATUS_NAME
from .anaf import ENDPOINT as ANAF_ENDPOINT
from .anaf import AnafClient, AnafProgress, collect_cuis, describe_anaf, lookup
from .archive import Archive, ArchiveError
from .crawl import CrawlError, CrawlProgress, Crawler, EliClient, complete_days, plan_run, run_crawl
from .crawl.client import DELAY as CRAWL_DELAY
from .crawl.unitdir import BACKFILL_KIND, CRAWLED_KINDS, contiguous_through, missing_days
from .crawl.progress import DEFAULT_CRAWL_STATUS_NAME, describe_crawl
from .crawl.backfill import PASSES as BACKFILL_PASSES, BulkIndex, archive_summary, plan_backfill, run_backfill, week_windows
from .crawl.backfill import FIRST_DAY as BACKFILL_FIRST_DAY, LAST_DAY_2021_22 as BACKFILL_LAST_DAY
from .crawl.backfill_progress import DEFAULT_BACKFILL_STATUS_NAME, BackfillProgress, describe_backfill
from .datagov import fetch_datagov
from .estimates import candidates as estimate_candidates
from .estimates import lookup as estimates_lookup
from .fetch import fetch_bulk_file
from .mf.fetch import fetch_mf
from . import acceptance_cli, placement_cli
from .refresh import Ledger, Pinger, run_refresh, run_seed, describe_refresh
from .refresh.engine import DeterministicError, TransientError, locked, refresh_steps
from .refresh.ledger import LEDGER_NAME
from .refresh.steps import Impl
from .progress import DEFAULT_STATUS_NAME, Progress, describe, effective_state, read_status, stamp
from .rebuild import rebuild
from .validate import summary_lines, validate_archive
from .bulk import KINDS
from . import backup as backup_module
from . import switchover

DEFAULT_ARCHIVE = os.environ.get("PIPELINE_ARCHIVE", "/archive")


def make_client(delay: float, log) -> EliClient:  # the one place the crawl's network client is made: tests replace it
    return EliClient(delay=delay, log=log)


def _day(text: str) -> date:
    try:
        return date.fromisoformat(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a date YYYY-MM-DD: {text!r}") from None


def stamp_now() -> str:
    return stamp(datetime.now(timezone.utc))


def _in_place_arg(p) -> None:
    on = os.environ.get("PIPELINE_REBUILD_IN_PLACE", "").strip().lower() in ("1", "true", "yes", "on")  # "0" and "false" are off
    p.add_argument("--in-place", action="store_true", default=on, help="rebuild into the database itself, locking it for the whole load, instead of beside it and switching over (env PIPELINE_REBUILD_IN_PLACE=1; for a new, empty database, e.g. a major upgrade)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--archive", default=DEFAULT_ARCHIVE, help="raw archive root (env PIPELINE_ARCHIVE)")
    sub = parser.add_subparsers(dest="verb", required=True)

    r = sub.add_parser("rebuild", help="derive the seap schema from the raw archive into the database")
    r.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    r.add_argument("--identity-overrides", default=os.environ.get("PIPELINE_IDENTITY_OVERRIDES"),
                   help="the reviewed identity override file (env PIPELINE_IDENTITY_OVERRIDES; default: pipeline/identity_overrides.toml)")
    r.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_PROGRESS_FILE; default <archive>/{DEFAULT_STATUS_NAME})")
    placement_cli.add_rebuild_args(r)
    _in_place_arg(r)

    r.add_argument("--today", type=_day, default=os.environ.get("PIPELINE_TODAY"), help="the day that ends the Coverage grid's last quarter (env PIPELINE_TODAY; default: today, UTC; for tests)")
    r.add_argument("--known-gaps", default=os.environ.get("PIPELINE_KNOWN_GAPS"), help="hand-edited known-gaps CSV for the Coverage grid (env PIPELINE_KNOWN_GAPS; default: pipeline/coverage/known_gaps.csv)")
    st = sub.add_parser("status", help="show the crawl cursor and data-through dates, and how far a running or finished rebuild, crawl and ANAF lookup are")
    st.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"), help="the rebuild's status file, as for rebuild")
    st.add_argument("--crawl-progress-file", default=os.environ.get("PIPELINE_CRAWL_PROGRESS_FILE"), help="the crawl's status file, as for crawl")
    st.add_argument("--backfill-progress-file", default=os.environ.get("PIPELINE_BACKFILL_PROGRESS_FILE"), help="the backfill's status file, as for backfill")
    st.add_argument("--anaf-progress-file", default=os.environ.get("PIPELINE_ANAF_PROGRESS_FILE"), help="the ANAF lookup's status file, as for anaf-lookup")

    c = sub.add_parser("crawl", help="crawl e-licitatie award notices (CAN, SCNA) and their contracts, day by day, into the raw archive (no loading)")
    c.add_argument("--from", dest="first", type=_day, help="first day of an explicit range (days already complete are skipped unless --force)")
    c.add_argument("--to", dest="last", type=_day, help="last day of the range (default: yesterday)")
    c.add_argument("--start", type=_day, default=os.environ.get("PIPELINE_CRAWL_START"),
                   help="where a first run with no cursor starts (env PIPELINE_CRAWL_START; default: the day after the last archived Contracte bulk quarter)")
    c.add_argument("--delay", type=float, default=float(os.environ.get("PIPELINE_CRAWL_DELAY", CRAWL_DELAY)), help=f"seconds between requests (default {CRAWL_DELAY})")
    c.add_argument("--force", action="store_true", help="fetch complete days of the range again")
    c.add_argument("--progress-file", default=os.environ.get("PIPELINE_CRAWL_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_CRAWL_PROGRESS_FILE; default <archive>/{DEFAULT_CRAWL_STATUS_NAME})")

    b = sub.add_parser("backfill", help="one-off, resumable backfill (#78): 2021-22 awards without a prior call, and 2023-today notices missing from the bulk, into the raw archive (no loading)")
    b.add_argument("--pass", dest="passes", choices=[*BACKFILL_PASSES, "all"], default="all", help="which pass to run (default: both, in order)")
    b.add_argument("--delay", type=float, default=float(os.environ.get("PIPELINE_CRAWL_DELAY", CRAWL_DELAY)), help=f"seconds between requests (env PIPELINE_CRAWL_DELAY, default {CRAWL_DELAY})")
    b.add_argument("--status", action="store_true", help="show how far the backfill is (weeks complete per pass, last run) and exit; no requests")
    b.add_argument("--progress-file", default=os.environ.get("PIPELINE_BACKFILL_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_BACKFILL_PROGRESS_FILE; default <archive>/{DEFAULT_BACKFILL_STATUS_NAME})")
    a = sub.add_parser("anaf-lookup", help="ask ANAF (v9) about every CUI in the raw archive it has not answered yet; archives each response (resumable)")
    a.add_argument("--progress-file", default=os.environ.get("PIPELINE_ANAF_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_ANAF_PROGRESS_FILE; default <archive>/{ANAF_STATUS_NAME})")
    a.add_argument("--recheck-after-days", type=int, default=None, help="also ask again about CUIs whose archived answer is older than this many days")
    a.add_argument("--max-batches", type=int, default=None, help="stop after this many requests (a small trial run)")
    a.add_argument("--endpoint", default=os.environ.get("PIPELINE_ANAF_URL", ANAF_ENDPOINT), help="the v9 URL (env PIPELINE_ANAF_URL; for a stub, never for the real one)")

    e = sub.add_parser("estimates", help="fetch the estimated value of every notice with a Record of 1 bn RON or more (the counting rule's check) from e-licitatie into the raw archive; resumable")
    e.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of the graph a rebuild loaded: it says which notices are candidates (env DATABASE_URL)")
    e.add_argument("--delay", type=float, default=float(os.environ.get("PIPELINE_CRAWL_DELAY", CRAWL_DELAY)), help=f"seconds between requests (default {CRAWL_DELAY})")
    e.add_argument("--max-notices", type=int, default=None, help="stop after this many requests (a small trial run)")

    q = sub.add_parser("requeue", help="move quarantined units back into the archive so the next rebuild reads them again (e.g. after a reader or header fix)")
    q.add_argument("--match", default="", help="only units whose path or reason contains this text, e.g. `unsupported file format` or `contracte/2022Q4`")

    v = sub.add_parser("validate", help="read-only: check every archived bulk file against its kind and report pass/fail per file; moves and quarantines nothing (exit 1 if any fails)")
    v.add_argument("--kind", action="append", choices=sorted(KINDS), help="only this kind (repeatable)")
    v.add_argument("--match", default="", help="only units whose path inside the archive contains this text, e.g. `2024Q1` or `contracte/2024Q1`")

    f = sub.add_parser("fetch-bulk", help="download one bulk file into the raw archive (no loading)")
    f.add_argument("--url", required=True)
    f.add_argument("--kind", default="da", choices=["da"])
    f.add_argument("--unit", required=True, help="the quarter, e.g. 2022Q1")
    f.add_argument("--via", required=True, help="the file as the Source titles it")

    g = sub.add_parser("fetch-datagov", help="fetch ADR's quarterly SEAP exports from data.gov.ro into the raw archive (no loading)")
    g.add_argument("--since-year", type=int, default=2021, help="first dataset year (achizitii-publice-YYYY), default 2021")
    g.add_argument("--delay", type=float, default=1.0, help="seconds between requests to data.gov.ro, default 1")

    sub.add_parser("fetch-mf", help="fetch the Ministry of Finance's monthly Lista entitatilor publice (newest snapshot) from data.gov.ro into the raw archive (no loading; resumable)")


    def load_args(p):  # what the verbs that load into the database share with `rebuild`
        p.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
        p.add_argument("--identity-overrides", default=os.environ.get("PIPELINE_IDENTITY_OVERRIDES"), help="the reviewed identity override file (env PIPELINE_IDENTITY_OVERRIDES)")
        p.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"), help=f"the rebuild's status file (env PIPELINE_PROGRESS_FILE; default <archive>/{DEFAULT_STATUS_NAME})")
        p.add_argument("--today", type=_day, default=os.environ.get("PIPELINE_TODAY"), help="the day that ends the Coverage grid's last quarter (env PIPELINE_TODAY; for tests)")
        p.add_argument("--known-gaps", default=os.environ.get("PIPELINE_KNOWN_GAPS"), help="hand-edited known-gaps CSV (env PIPELINE_KNOWN_GAPS)")
        placement_cli.add_rebuild_args(p)
        _in_place_arg(p)

    rf = sub.add_parser("refresh", help="the nightly run (#81): crawl, data.gov.ro + MF list, ANAF, load; each step only when due, under one lock; healthchecks pings")
    load_args(rf)
    rf.add_argument("--healthcheck-url", default=os.environ.get("PIPELINE_HEALTHCHECK_URL"), help="healthchecks.io ping URL (env PIPELINE_HEALTHCHECK_URL; unset = no pings)")
    rf.add_argument("--trigger", default="manual", help="what started the run, recorded in the ledger (the systemd unit passes `timer`)")
    rf.add_argument("--delay", type=float, default=float(os.environ.get("PIPELINE_CRAWL_DELAY", CRAWL_DELAY)), help=f"seconds between crawl requests (default {CRAWL_DELAY})")

    sd = sub.add_parser("seed", help="the first-time sequence, resumable: data.gov.ro + MF list, ANAF, load (reads the archived ANAF answers), optionally the backfill; steps done in an earlier seed are skipped")
    load_args(sd)
    sd.add_argument("--backfill", action="store_true", help="also run the 2021-22 backfill crawl (hours) as the last step")
    sd.add_argument("--again", action="store_true", help="forget what earlier seeds finished and run every step (each still skips what it already archived)")
    sd.add_argument("--delay", type=float, default=float(os.environ.get("PIPELINE_CRAWL_DELAY", CRAWL_DELAY)), help=f"seconds between crawl requests (default {CRAWL_DELAY})")

    lq = sub.add_parser("load-quarter", help="load one quarter again from the archive, without downloading: requeue its quarantined files, then rebuild")
    lq.add_argument("quarter", help="e.g. 2023Q2")
    load_args(lq)

    for verb, text in (("rollback", "swap the database back to the graph from before the last switchover (and back again)"),
                       ("cleanup", "drop the old graph kept by the last switchover (<db>_prev) and any unfinished or refused build (<db>_next)")):
        sub.add_parser(verb, help=text).add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of the live database (env DATABASE_URL)")
    vf = sub.add_parser("verify", help="run the switchover checks on a database (e.g. a major-upgrade rebuild in a new volume) and exit 1 if any fail")
    vf.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of the graph to check (env DATABASE_URL)")
    vf.add_argument("--against", help="Postgres URL of the graph it would replace (its Record count is the floor)")

    bk = sub.add_parser("backup", help="back up now (the refresh does it on schedule): the raw archive and/or a pg_dump into the restic repository (env RESTIC_REPOSITORY)")
    bk.add_argument("what", nargs="?", choices=("archive", "dump", "all"), default="all")
    bk.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL to dump (env DATABASE_URL)")
    rs = sub.add_parser("restore", help="restore from the restic repository: `restore archive DIR` into a new directory, `restore dump` into an empty database (--db)")
    rs.add_argument("what", choices=("archive", "dump"))
    rs.add_argument("target", nargs="?", help="the new directory for `archive`")
    rs.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL of the empty database for `dump`")
    rs.add_argument("--snapshot", default="latest", help="a snapshot id (default: the latest of that kind)")

    placement_cli.add_parsers(sub)
    acceptance_cli.add_parsers(sub)

    args = parser.parse_args(argv)
    archive = Archive(args.archive)
    if (code := placement_cli.run(archive, args)) is not None:
        return code
    if (code := acceptance_cli.run(archive, args)) is not None:
        return code
    if args.verb == "rebuild":
        if not args.db:
            parser.error("--db or DATABASE_URL is required")
        status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
        # a kill (SIGTERM) must end like any failure: the transaction rolls back and the status file says so
        signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
        placement_cli.log_to_stderr()  # the placement step logs every authority it could not match
        with locked(archive) as got:  # one long run at a time: not beside a refresh or a seed
            if not got:
                print("rebuild: a refresh or a seed holds the archive's lock (refresh.lock); try again when it ends", file=sys.stderr)
                return 1
            try:
                summary = _rebuild_beside(archive, args, Progress(status_file), _log_line)
            except switchover.SwitchoverRefused as e:
                print(f"rebuild: the new graph failed its checks, nothing switched: {e}", file=sys.stderr)
                return 1
            for line in summary.lines():
                print(line, flush=True)
        return 0
    if args.verb in ("rollback", "cleanup", "verify", "backup", "restore"):
        return _operate(archive, args, parser)
    if args.verb == "anaf-lookup":
        status_file = Path(args.progress_file) if args.progress_file else archive.root / ANAF_STATUS_NAME
        signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
        logging.getLogger("pipeline").handlers[:] = [handler]
        logging.getLogger("pipeline").setLevel(logging.INFO)
        progress = AnafProgress(status_file)

        def scanned(line: str) -> None:
            print(f"{stamp_now()} {line}", flush=True)
            progress.note(line)

        try:
            cuis = collect_cuis(archive, say=scanned)
        except BaseException as e:  # incl. SIGTERM: the status file must say it stopped
            progress.fail(e)
            raise
        print(f"{stamp_now()} anaf scan done: {len(cuis)} distinct CUIs in the archive", flush=True)
        summary = lookup(archive, cuis, AnafClient(endpoint=args.endpoint), progress,
                         recheck_after_days=args.recheck_after_days, max_batches=args.max_batches)
        return 1 if summary.failed_batches else 0
    if args.verb in ("refresh", "seed"):
        return _refresh(archive, args)
    if args.verb == "load-quarter":
        return _load_quarter(archive, args)
    if args.verb == "status":
        return _status(archive, args)
    if args.verb == "crawl":
        return _crawl(archive, args)
    if args.verb == "backfill":
        return _backfill(archive, args)
    if args.verb == "estimates":
        return _estimates(archive, args)
    if args.verb == "validate":
        results = validate_archive(archive, args.kind, args.match, _print_result)
        for line in summary_lines(results):
            print(line)
        return 0 if all(r.ok for r in results) else 1
    if args.verb == "requeue":
        try:
            restored = archive.requeue(args.match)
        except ArchiveError as e:
            print(str(e), file=sys.stderr)
            return 1
        for path in restored:
            print(f"requeued {path}")
        print(f"requeued {len(restored)} unit(s); {len(archive.quarantined())} still in quarantine")
        return 0
    if args.verb == "fetch-bulk":
        print(fetch_bulk_file(archive, url=args.url, kind=args.kind, unit=args.unit, via=args.via))
        return 0
    if args.verb == "fetch-datagov":
        handler = logging.StreamHandler(sys.stderr)  # flushes every record: a nohup log is current line by line
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
        logging.getLogger("pipeline").handlers[:] = [handler]  # replace, so repeated calls never stack handlers
        logging.getLogger("pipeline").setLevel(logging.INFO)
        summary = fetch_datagov(archive, since_year=args.since_year, delay=args.delay)
        for line in summary.lines():
            print(line)
        return 1 if summary.failed else 0
    if args.verb == "fetch-mf":
        handler = logging.StreamHandler(sys.stderr)  # flushes every record: a nohup log is current line by line
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
        logging.getLogger("pipeline").handlers[:] = [handler]
        logging.getLogger("pipeline").setLevel(logging.INFO)
        summary = fetch_mf(archive)
        for line in summary.lines():
            print(line)
        return 1 if summary.failed else 0
    return 2


def _print_result(r) -> None:
    where = f"{r.kind}/{r.unit}"
    if r.ok:
        print(f"PASS {where}  {r.rows} rows, {r.records} records  {r.path}", flush=True)
    else:
        print(f"FAIL {where}  {r.reason}  {r.path}", flush=True)
        for p in r.problems[:5]:
            print(f"       {p}", flush=True)


def _log_line(line: str) -> None:
    print(f"{stamp_now()} {line}", flush=True)


def _rebuild_beside(archive: Archive, args, progress: Progress, say):
    """The rebuild every verb shares: into a fresh database beside the live one, checked, then switched over (switchover.py);
    `--in-place` rebuilds into the database itself (it locks it for the whole load)."""
    def build(url: str, gate=None):
        return rebuild(archive, url, progress, overrides_path=args.identity_overrides, placement_dir=args.placement_data,
                       geo_dir=args.geo_dir, today=args.today, known_gaps_path=args.known_gaps, gate=gate)
    if args.in_place:
        return build(args.db)
    return switchover.build_and_switch(args.db, build, say=say)


def _operate(archive: Archive, args, parser) -> int:
    """`rollback`, `cleanup`, `verify`, `backup`, `restore`: one-shot operator verbs, timestamped lines on stdout."""
    if args.verb in ("rollback", "cleanup", "verify") and not args.db:
        parser.error("--db or DATABASE_URL is required")
    if args.verb in ("rollback", "cleanup"):
        with locked(archive) as got:  # not beside a refresh: a cleanup mid-build drops the database being built, a rollback races the swap
            if not got:
                print(f"{args.verb}: a refresh or a seed holds the archive's lock (refresh.lock); try again when it ends", file=sys.stderr)
                return 1
            if args.verb == "cleanup":
                switchover.cleanup(args.db, _log_line)
                return 0
            try:
                switchover.rollback(args.db, _log_line)
            except LookupError as e:
                print(f"rollback: {e}", file=sys.stderr)
                return 1
    elif args.verb == "verify":
        failures = switchover.check_graph(args.db, args.against)
        for f in failures:
            _log_line(f"verify: FAILED: {f}")
        _log_line("verify: FAILED" if failures else "verify: all checks passed")
        return 1 if failures else 0
    else:
        restic = backup_module.Restic()
        try:
            if args.verb == "backup":
                if not restic.configured:
                    print("backup: RESTIC_REPOSITORY is not set", file=sys.stderr)
                    return 1
                if args.what in ("archive", "all"):
                    _log_line(f"backup archive: {backup_module.backup_archive(archive, restic, _log_line).counts}")
                if args.what in ("dump", "all"):
                    _log_line(f"backup dump: {backup_module.backup_dump(args.db, restic, _log_line).counts}")
            elif args.what == "archive":
                if not args.target:
                    parser.error("restore archive needs the new directory to restore into")
                _log_line(f"restored the archive into {backup_module.restore_archive(restic, Path(args.target), args.snapshot)}")
            else:
                if not args.db:
                    parser.error("restore dump needs --db (an empty database)")
                backup_module.restore_dump(restic, args.db, args.snapshot)
                _log_line("restored the dump")
        except (DeterministicError, TransientError, LookupError, FileExistsError, RuntimeError) as e:
            print(f"{args.verb}: {e}", file=sys.stderr)
            return 1
    return 0


def _loader(archive: Archive, args):
    """A callable that rebuilds the graph from the archive with the verb's options (a refresh, a seed or load-quarter)."""
    def load():
        if not args.db:
            raise DeterministicError("no database: pass --db or set DATABASE_URL")
        status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
        placement_cli.log_to_stderr()
        try:
            summary = _rebuild_beside(archive, args, Progress(status_file), _log_line)
        except switchover.SwitchoverRefused as e:  # the live graph keeps serving; a human looks (deterministic: the same archive fails the same way)
            raise DeterministicError(f"the new graph failed its checks, nothing switched, the live graph keeps serving: {e}") from e
        for line in summary.lines():
            _log_line(line)
        return summary
    return load


def _impl(archive: Archive, args) -> Impl:
    # every dependency is looked up in this module when called, so tests can replace `make_client`, `fetch_datagov`, `fetch_mf`
    def backfill() -> int:
        ns = argparse.Namespace(passes="all", delay=args.delay, status=False, progress_file=None)
        return _backfill(archive, ns)

    return Impl(archive, _log_line, lambda delay, log: make_client(delay, log), lambda a: fetch_datagov(a), lambda a: fetch_mf(a),
                lambda: AnafClient(endpoint=os.environ.get("PIPELINE_ANAF_URL", ANAF_ENDPOINT)), _loader(archive, args), backfill, crawl_delay=args.delay,
                backup_fn=lambda: backup_module.backup_archive(archive, backup_module.Restic(), _log_line),
                pgdump_fn=lambda: backup_module.backup_dump(args.db, backup_module.Restic(), _log_line),
                crawl_start=_day(os.environ["PIPELINE_CRAWL_START"]) if os.environ.get("PIPELINE_CRAWL_START") else None)


def _logging_to_stderr() -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z"))
    logging.getLogger("pipeline").handlers[:] = [handler]
    logging.getLogger("pipeline").setLevel(logging.INFO)


def _refresh(archive: Archive, args) -> int:
    """`refresh` (nightly, pings healthchecks.io) and `seed` (first time, no pings): one locked run, one timestamped log on stdout."""
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
    _logging_to_stderr()
    impl = _impl(archive, args)
    if args.verb == "seed":
        return run_seed(archive, impl, backfill=args.backfill, again=args.again, say=_log_line).exit_code
    return run_refresh(archive, impl, pinger=Pinger(args.healthcheck_url), trigger=args.trigger, say=_log_line).exit_code


def _load_quarter(archive: Archive, args) -> int:
    quarter = args.quarter.upper()
    if len(quarter) != 6 or quarter[4] != "Q" or not quarter[:4].isdigit() or quarter[5] not in "1234":
        print(f"load-quarter: not a quarter like 2023Q2: {args.quarter!r}", file=sys.stderr)
        return 2
    held = [u for u in archive.units() if u.unit == quarter and u.kind in ("da", "dan", "contracte", "scna")]
    restored = archive.requeue(f"/{quarter}/")
    for path in restored:
        _log_line(f"requeued {path}")
    if not held and not restored:
        print(f"load-quarter: nothing archived for {quarter}; fetch it first (`fetch-datagov`)", file=sys.stderr)
        return 1
    _log_line(f"load-quarter {quarter}: {len(held) + len(restored)} unit(s) in the archive; the graph is derived whole from the archive, so this is a rebuild")
    with locked(archive) as got:  # one long run at a time: not beside a refresh or a seed
        if not got:
            print("load-quarter: a refresh or a seed holds the archive's lock (refresh.lock); try again when it ends", file=sys.stderr)
            return 1
        try:
            _loader(archive, args)()
        except DeterministicError as e:
            print(f"load-quarter: {e}", file=sys.stderr)
            return 2
    still = [p for p in archive.quarantined() if f"/{quarter}/" in str(p)]
    for p in still:
        _log_line(f"load-quarter {quarter}: still quarantined, so not yet loaded: {p}")
    return 1 if still else 0


def _status(archive: Archive, args) -> int:
    """The rebuild's status (as before), the ANAF lookup's and the crawl's: cursor and data-through dates from the archive, the last run from its status file."""
    status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
    crawl_file = Path(args.crawl_progress_file) if args.crawl_progress_file else archive.root / DEFAULT_CRAWL_STATUS_NAME
    anaf_file = Path(args.anaf_progress_file) if args.anaf_progress_file else archive.root / ANAF_STATUS_NAME
    status, crawl_status, anaf = read_status(status_file), read_status(crawl_file), read_status(anaf_file)
    days = complete_days(archive)
    code = 0
    if status is None:
        print(f"no rebuild status at {status_file}")
        code = 1
    else:
        for line in describe(status):
            print(line)
        code = 1 if effective_state(status) in ("failed", "interrupted") else 0
    if anaf is not None:
        print()
        for line in describe_anaf(anaf):
            print(line)
        if effective_state(anaf) in ("failed", "interrupted"):
            code = 1
        elif status is None and not (days or crawl_status is not None):
            code = 0  # no rebuild yet is not a failure once an ANAF lookup is on record
    if days or crawl_status is not None:
        for line in describe_crawl(crawl_status, max(days) if days else None, len(days), through={k: contiguous_through(archive, bulk_kind=b) for k, b in CRAWLED_KINDS.items()},
                                 missing={k: missing_days(archive, bulk_kind=b) for k, b in CRAWLED_KINDS.items()}):
            print(line)
        if crawl_status is not None and effective_state(crawl_status) in ("failed", "interrupted"):
            code = 1
        elif status is None:
            code = 0  # no rebuild yet is not a failure once a crawl is on record
    held = archive_summary(archive)
    backfill_status = read_status(Path(args.backfill_progress_file) if args.backfill_progress_file else archive.root / DEFAULT_BACKFILL_STATUS_NAME)
    if held or backfill_status is not None:  # the backfill (#78) has its own unit kind and cursor, so it is listed apart from the crawl's
        for line in describe_backfill(backfill_status, held, _backfill_totals(backfill_status)):
            print(line)
        if backfill_status is not None and effective_state(backfill_status) in ("failed", "interrupted", "aborted"):
            code = 1
        elif not any(x is not None and effective_state(x) in ("failed", "interrupted") for x in (status, anaf, crawl_status)):
            code = 0  # no rebuild yet is not a failure once a backfill is on record
    ledger = Ledger(archive.root / LEDGER_NAME)
    print()  # the refresh run (#81): recent runs, what is due, open quarantines
    dummy = SimpleNamespace(crawl=None, datagov=None, anaf=None, load=None, backup=None, pgdump=None)
    for line in describe_refresh(archive, ledger, refresh_steps(archive, dummy)):
        print(line)
    if ledger.runs and ledger.runs[-1]["status"] == "failed":
        code = 1
    return code


def _backfill_totals(status: dict | None) -> dict[str, int]:
    """Weeks per pass: the 2021-22 pass is fixed; the 2023-today one is what the last run planned (it depends on today and on the bulk)."""
    totals = {name: c["total"] for name, c in ((status or {}).get("passes") or {}).items()}
    totals[BACKFILL_PASSES[0]] = len(week_windows(BACKFILL_FIRST_DAY, BACKFILL_LAST_DAY))
    return totals


def _backfill(archive: Archive, args) -> int:
    status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_BACKFILL_STATUS_NAME
    if args.status:
        status = read_status(status_file)
        for line in describe_backfill(status, archive_summary(archive), _backfill_totals(status)):
            print(line)
        return 1 if status is not None and effective_state(status) in ("failed", "interrupted", "aborted") else 0
    progress = BackfillProgress(status_file)  # lines go to stdout, flushed one by one: a nohup log is current
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))  # a kill ends like any failure: status file says so, complete weeks stay
    passes = BACKFILL_PASSES if args.passes == "all" else (args.passes,)
    if BACKFILL_PASSES[1] in passes:
        progress.note("backfill reading the 2023+ bulk files (a few minutes)")
    bulk = BulkIndex.read(archive, lambda text: progress.note(text)) if BACKFILL_PASSES[1] in passes else None
    crawler = Crawler(archive, make_client(args.delay, progress.note), note=progress.note, kind=BACKFILL_KIND)
    plans = plan_backfill(archive, today=datetime.now(timezone.utc).date(), passes=passes, bulk=bulk)
    return 0 if run_backfill(archive, crawler, plans, progress, bulk=bulk).ok else 1


def _estimates(archive: Archive, args) -> int:
    """Ask e-licitatie for the estimated value of each candidate notice not yet archived (one timestamped line per notice, flushed)."""
    if not args.db:
        print("estimates: --db or DATABASE_URL is required (run `rebuild` first: it says which notices are candidates)", file=sys.stderr)
        return 2
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
    codes = estimate_candidates(args.db)
    say = lambda line: print(line, flush=True)
    say(f"{stamp_now()} estimates candidates: {len(codes)} notice(s) with a Record of 1 bn RON or more")
    try:
        estimates_lookup(archive, codes, make_client(args.delay, lambda line: say(f"{stamp_now()} {line}")), say, max_notices=args.max_notices)
    except CrawlError as e:
        say(f"{stamp_now()} estimates FAILED: {e}; every finished notice is archived, rerun the same command to resume")
        return 1
    return 0


def _crawl(archive: Archive, args) -> int:
    # lines go to stdout, flushed one by one (CrawlProgress): a nohup log is current
    progress = CrawlProgress(Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_CRAWL_STATUS_NAME)
    # a kill (SIGTERM) must end like any failure: the status file says so, and complete days stay complete
    signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
    try:
        plan = plan_run(archive, today=datetime.now(timezone.utc).date(), first=args.first, last=args.last, start=args.start, force=args.force)
    except CrawlError as e:
        print(f"crawl: {e}", file=sys.stderr)
        return 2
    crawler = Crawler(archive, make_client(args.delay, progress.note), note=progress.note)
    return 0 if run_crawl(archive, crawler, plan, progress).ok else 1


if __name__ == "__main__":
    sys.exit(main())
