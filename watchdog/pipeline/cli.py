"""pipeline CLI. `python -m pipeline <verb>` from `watchdog/` (or `pipeline <verb>` in the pipeline image)."""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
from pathlib import Path

from .archive import Archive, ArchiveError
from .datagov import fetch_datagov
from .fetch import fetch_bulk_file
from .progress import DEFAULT_STATUS_NAME, Progress, describe, effective_state, read_status
from .rebuild import rebuild

DEFAULT_ARCHIVE = os.environ.get("PIPELINE_ARCHIVE", "/archive")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--archive", default=DEFAULT_ARCHIVE, help="raw archive root (env PIPELINE_ARCHIVE)")
    sub = parser.add_subparsers(dest="verb", required=True)

    r = sub.add_parser("rebuild", help="derive the seap schema from the raw archive into the database")
    r.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")
    r.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_PROGRESS_FILE; default <archive>/{DEFAULT_STATUS_NAME})")

    st = sub.add_parser("status", help="show how far a running or finished rebuild is (reads its status file)")
    st.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"), help="as for rebuild")

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
        status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
        status = read_status(status_file)
        if status is None:
            print(f"no rebuild status at {status_file}")
            return 1
        for line in describe(status):
            print(line)
        return 1 if effective_state(status) in ("failed", "interrupted") else 0
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


if __name__ == "__main__":
    sys.exit(main())
