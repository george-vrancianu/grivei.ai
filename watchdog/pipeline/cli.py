"""pipeline CLI. `python -m pipeline <verb>` from `watchdog/` (or `pipeline <verb>` in the pipeline image)."""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
from datetime import datetime, timezone
from pathlib import Path

from .anaf import DEFAULT_STATUS_NAME as ANAF_STATUS_NAME
from .anaf import ENDPOINT as ANAF_ENDPOINT
from .anaf import AnafClient, AnafProgress, collect_cuis, describe_anaf, lookup
from .archive import Archive, ArchiveError
from .datagov import fetch_datagov
from .fetch import fetch_bulk_file
from .progress import DEFAULT_STATUS_NAME, Progress, describe, effective_state, read_status, stamp
from .rebuild import rebuild

DEFAULT_ARCHIVE = os.environ.get("PIPELINE_ARCHIVE", "/archive")


def stamp_now() -> str:
    return stamp(datetime.now(timezone.utc))


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

    st = sub.add_parser("status", help="show how far a running or finished rebuild and ANAF lookup are (reads their status files)")
    st.add_argument("--progress-file", default=os.environ.get("PIPELINE_PROGRESS_FILE"), help="the rebuild's status file, as for rebuild")
    st.add_argument("--anaf-progress-file", default=os.environ.get("PIPELINE_ANAF_PROGRESS_FILE"), help="the ANAF lookup's status file, as for anaf-lookup")

    a = sub.add_parser("anaf-lookup", help="ask ANAF (v9) about every CUI in the raw archive it has not answered yet; archives each response (resumable)")
    a.add_argument("--progress-file", default=os.environ.get("PIPELINE_ANAF_PROGRESS_FILE"),
                   help=f"status file `status` reads (env PIPELINE_ANAF_PROGRESS_FILE; default <archive>/{ANAF_STATUS_NAME})")
    a.add_argument("--recheck-after-days", type=int, default=None, help="also ask again about CUIs whose archived answer is older than this many days")
    a.add_argument("--max-batches", type=int, default=None, help="stop after this many requests (a small trial run)")
    a.add_argument("--endpoint", default=os.environ.get("PIPELINE_ANAF_URL", ANAF_ENDPOINT), help="the v9 URL (env PIPELINE_ANAF_URL; for a stub, never for the real one)")

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
        for line in rebuild(archive, args.db, Progress(status_file), overrides_path=args.identity_overrides).lines():
            print(line, flush=True)
        return 0
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
        lookup(archive, cuis, AnafClient(endpoint=args.endpoint), progress,
               recheck_after_days=args.recheck_after_days, max_batches=args.max_batches)
        return 0
    if args.verb == "status":
        status_file = Path(args.progress_file) if args.progress_file else archive.root / DEFAULT_STATUS_NAME
        anaf_file = Path(args.anaf_progress_file) if args.anaf_progress_file else archive.root / ANAF_STATUS_NAME
        status, anaf = read_status(status_file), read_status(anaf_file)
        if status is None and anaf is None:
            print(f"no rebuild status at {status_file}")
            return 1
        code = 0
        if status is None:
            print(f"no rebuild status at {status_file}")
        else:
            for line in describe(status):
                print(line)
            code = 1 if effective_state(status) in ("failed", "interrupted") else 0
        if anaf is not None:
            if status is not None:
                print()
            for line in describe_anaf(anaf):
                print(line)
            code = max(code, 1 if effective_state(anaf) in ("failed", "interrupted") else 0)
        return code
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
