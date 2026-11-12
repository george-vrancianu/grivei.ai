"""pipeline CLI. `python -m pipeline <verb>` from `watchdog/` (or `pipeline <verb>` in the pipeline image)."""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from .archive import Archive, ArchiveError
from .crawl import CrawlError, CrawlProgress, Crawler, EliClient, complete_days, plan_run, run_crawl
from .crawl.client import DELAY as CRAWL_DELAY
from .crawl.unitdir import BACKFILL_KIND, CRAWLED_KINDS, contiguous_through, missing_days
from .crawl.progress import DEFAULT_CRAWL_STATUS_NAME, describe_crawl
from .crawl.backfill import PASSES as BACKFILL_PASSES, BulkIndex, archive_summary, plan_backfill, run_backfill, week_windows
from .crawl.backfill import FIRST_DAY as BACKFILL_FIRST_DAY, LAST_DAY_2021_22 as BACKFILL_LAST_DAY
from .crawl.backfill_progress import DEFAULT_BACKFILL_STATUS_NAME, BackfillProgress, describe_backfill
from .datagov import fetch_datagov
from .fetch import fetch_bulk_file
from .progress import DEFAULT_STATUS_NAME, Progress, describe, effective_state, read_status
from .rebuild import rebuild

DEFAULT_ARCHIVE = os.environ.get("PIPELINE_ARCHIVE", "/archive")


def make_client(delay: float, log) -> EliClient:  # the one place the crawl's network client is made: tests replace it
    return EliClient(delay=delay, log=log)


def _day(text: str) -> date:
    try:
        return date.fromisoformat(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a date YYYY-MM-DD: {text!r}") from None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--archive", default=DEFAULT_ARCHIVE, help="raw archive root (env PIPELINE_ARCHIVE)")
    sub = parser.add_subparsers(dest="verb", required=True)

    r = sub.add_parser("rebuild", help="derive the seap schema from the raw archive into the database")
    r.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    r.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_PROGRESS_FILE; default <archive>/{DEFAULT_STATUS_NAME})")

    st = sub.add_parser("status", help="show the crawl cursor and data-through dates, and how far a running or finished rebuild and crawl are")
    st.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"), help="the rebuild's status file, as for rebuild")
    st.add_argument("--crawl-progress-file", default=os.environ.get("PIPELINE_CRAWL_PROGRESS_FILE"), help="the crawl's status file, as for crawl")
    st.add_argument("--backfill-progress-file", default=os.environ.get("PIPELINE_BACKFILL_PROGRESS_FILE"), help="the backfill's status file, as for backfill")

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

    q = sub.add_parser("requeue", help="move quarantined units back into the archive so the next rebuild reads them again (e.g. after a reader or header fix)")
    q.add_argument("--match", default="", help="only units whose path or reason contains this text, e.g. `unsupported file format` or `contracte/2022Q4`")

    f = sub.add_parser("fetch-bulk", help="download one bulk file into the raw archive (no loading)")
    f.add_argument("--url", required=True)
    f.add_argument("--kind", default="da", choices=["da"])
    f.add_argument("--unit", required=True, help="the quarter, e.g. 2022Q1")
    f.add_argument("--via", required=True, help="the file as the Source titles it")

    g = sub.add_parser("fetch-datagov", help="fetch ADR's quarterly SEAP exports from data.gov.ro into the raw archive (no loading)")
    g.add_argument("--since-year", type=int, default=2021, help="first dataset year (achizitii-publice-YYYY), default 2021")
    g.add_argument("--delay", type=float, default=1.0, help="seconds between requests to data.gov.ro, default 1")

    args = parser.parse_args(argv)
    archive = Archive(args.archive)
    if args.verb == "rebuild":
        if not args.db:
            parser.error("--db or DATABASE_URL is required")
        status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
        # a kill (SIGTERM) must end like any failure: the transaction rolls back and the status file says so
        signal.signal(signal.SIGTERM, lambda signum, frame: sys.exit(128 + signum))
        for line in rebuild(archive, args.db, Progress(status_file)).lines():
            print(line, flush=True)
        return 0
    if args.verb == "status":
        return _status(archive, args)
    if args.verb == "crawl":
        return _crawl(archive, args)
    if args.verb == "backfill":
        return _backfill(archive, args)
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
    return 2


def _status(archive: Archive, args) -> int:
    """The rebuild's status (as before) and the crawl's: cursor and data-through dates from the archive, the last run from its status file."""
    status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
    crawl_file = Path(args.crawl_progress_file) if args.crawl_progress_file else archive.root / DEFAULT_CRAWL_STATUS_NAME
    status, crawl_status = read_status(status_file), read_status(crawl_file)
    days = complete_days(archive)
    code = 0
    if status is None:
        print(f"no rebuild status at {status_file}")
        code = 1
    else:
        for line in describe(status):
            print(line)
        code = 1 if effective_state(status) in ("failed", "interrupted") else 0
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
        elif status is None and not (crawl_status is not None and effective_state(crawl_status) in ("failed", "interrupted")):
            code = 0  # no rebuild yet is not a failure once a backfill is on record
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
    bulk = BulkIndex.read(archive, lambda text: progress.note(text)) if BACKFILL_PASSES[1] in passes else None
    crawler = Crawler(archive, make_client(args.delay, progress.note), note=progress.note, kind=BACKFILL_KIND)
    plans = plan_backfill(archive, today=datetime.now(timezone.utc).date(), passes=passes, bulk=bulk)
    return 0 if run_backfill(archive, crawler, plans, progress, bulk=bulk).ok else 1


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
