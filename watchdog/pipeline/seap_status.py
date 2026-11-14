"""SEAP's part of `pipeline status`: the crawl's cursor and data-through dates, and the backfill's weeks.

It is the `status` hook of SEAP's entry in `sources.py`; `cli._status` calls every registered Source's hook in turn, so a later Source
adds its own section without touching this one."""
from __future__ import annotations

from pathlib import Path

from .archive import Archive
from .crawl import complete_days
from .crawl.backfill import FIRST_DAY as BACKFILL_FIRST_DAY
from .crawl.backfill import LAST_DAY_2021_22 as BACKFILL_LAST_DAY
from .crawl.backfill import PASSES as BACKFILL_PASSES
from .crawl.backfill import archive_summary, week_windows
from .crawl.backfill_progress import DEFAULT_BACKFILL_STATUS_NAME, describe_backfill
from .crawl.progress import DEFAULT_CRAWL_STATUS_NAME, describe_crawl
from .crawl.unitdir import CRAWLED_KINDS, contiguous_through, missing_days
from .progress import effective_state, read_status


def backfill_totals(status: dict | None) -> dict[str, int]:
    """Weeks per pass: the 2021-22 pass is fixed; the 2023-today one is what the last run planned (it depends on today and on the bulk)."""
    totals = {name: c["total"] for name, c in ((status or {}).get("passes") or {}).items()}
    totals[BACKFILL_PASSES[0]] = len(week_windows(BACKFILL_FIRST_DAY, BACKFILL_LAST_DAY))
    return totals


def describe_status(archive: Archive, args, rebuild_status: dict | None, anaf_status: dict | None, code: int) -> int:
    """Print the crawl's and the backfill's sections; return the exit code (`code` so far, adjusted the way each section always did)."""
    crawl_file = Path(args.crawl_progress_file) if args.crawl_progress_file else archive.root / DEFAULT_CRAWL_STATUS_NAME
    crawl_status = read_status(crawl_file)
    days = complete_days(archive)
    if days or crawl_status is not None:
        for line in describe_crawl(crawl_status, max(days) if days else None, len(days), through={k: contiguous_through(archive, bulk_kind=b) for k, b in CRAWLED_KINDS.items()},
                                 missing={k: missing_days(archive, bulk_kind=b) for k, b in CRAWLED_KINDS.items()}):
            print(line)
        if crawl_status is not None and effective_state(crawl_status) in ("failed", "interrupted"):
            code = 1
        elif rebuild_status is None:
            code = 0  # no rebuild yet is not a failure once a crawl is on record
    held = archive_summary(archive)
    backfill_status = read_status(Path(args.backfill_progress_file) if args.backfill_progress_file else archive.root / DEFAULT_BACKFILL_STATUS_NAME)
    if held or backfill_status is not None:  # the backfill (#78) has its own unit kind and cursor, so it is listed apart from the crawl's
        for line in describe_backfill(backfill_status, held, backfill_totals(backfill_status)):
            print(line)
        if backfill_status is not None and effective_state(backfill_status) in ("failed", "interrupted", "aborted"):
            code = 1
        elif not any(x is not None and effective_state(x) in ("failed", "interrupted") for x in (rebuild_status, anaf_status, crawl_status)):
            code = 0  # no rebuild yet is not a failure once a backfill is on record
    return code
