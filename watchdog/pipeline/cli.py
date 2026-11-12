"""pipeline CLI. `python -m pipeline <verb>` from `watchdog/` (or `pipeline <verb>` in the pipeline image)."""
from __future__ import annotations

import argparse
import os
import sys

from .archive import Archive
from .fetch import fetch_bulk_file
from .rebuild import rebuild

DEFAULT_ARCHIVE = os.environ.get("PIPELINE_ARCHIVE", "/archive")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--archive", default=DEFAULT_ARCHIVE, help="raw archive root (env PIPELINE_ARCHIVE)")
    sub = parser.add_subparsers(dest="verb", required=True)

    r = sub.add_parser("rebuild", help="derive the seap schema from the raw archive into the database")
    r.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="Postgres URL (env DATABASE_URL)")

    f = sub.add_parser("fetch-bulk", help="download one bulk file into the raw archive (no loading)")
    f.add_argument("--url", required=True)
    f.add_argument("--kind", default="da", choices=["da"])
    f.add_argument("--unit", required=True, help="the quarter, e.g. 2022Q1")
    f.add_argument("--via", required=True, help="the file as the Source titles it")

    args = parser.parse_args(argv)
    archive = Archive(args.archive)
    if args.verb == "rebuild":
        if not args.db:
            parser.error("--db or DATABASE_URL is required")
        for line in rebuild(archive, args.db).lines():
            print(line)
        return 0
    if args.verb == "fetch-bulk":
        print(fetch_bulk_file(archive, url=args.url, kind=args.kind, unit=args.unit, via=args.via))
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
