"""`pipeline crawl`: which days to crawl, and the unattended run over them.

No range (the nightly run): catch up from the cursor, i.e. the last day with a complete manifest, to yesterday, plus a trailing
re-crawl of the 3 days ending at the cursor (late publications and re-dated notices show up days after the fact; the re-crawled
day is a new dated fetch and the load upserts by Record identity). Days already complete are skipped, so a killed run is
simply started again. With no cursor yet it starts at `start` (`--start`, `PIPELINE_CRAWL_START`), else the first day after the
last quarter whose Contracte bulk file is archived: the quarters the bulk has not reached.

An explicit range (`--from` / `--to`, the reusable core #78 calls): every day in it, complete days skipped unless `force`.

The run stops at the first day that fails (`CrawlError`, or a signal): a later day is never completed past a hole, so the
cursor (the last complete day) never skips a day by itself.
"""
from __future__ import annotations

import calendar
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Callable

from ..archive import Archive
from .client import CrawlError
from .core import Crawler
from .progress import CrawlProgress
from .unitdir import complete_days, cursor, days_between, manifest_of

TRAILING_DAYS = 3


@dataclass
class RunPlan:
    days: list[date]
    recrawl: frozenset[date]  # complete days to fetch again (the trailing window)
    cursor: date | None
    first: date | None
    last: date | None
    force: bool = False


@dataclass
class RunSummary:
    plan: RunPlan
    crawled: list[date] = field(default_factory=list)
    skipped: list[date] = field(default_factory=list)
    failed: date | None = None
    error: str | None = None
    notices: int = 0
    contracts: int = 0

    @property
    def ok(self) -> bool:
        return self.failed is None


def last_bulk_quarter_end(archive: Archive, kind: str = "contracte") -> date | None:
    """The last day of the latest quarter with a complete bulk unit of `kind`, from the directory names (no hashing)."""
    base = archive.root / "seap" / "bulk" / kind
    best: tuple[int, int] | None = None
    if base.is_dir():
        for unit in base.iterdir():
            m = re.fullmatch(r"(\d{4})Q([1-4])", unit.name)
            if m and any(manifest_of(d) for d in unit.iterdir() if d.is_dir()):
                key = (int(m[1]), int(m[2]))
                best = max(best, key) if best else key
    if best is None:
        return None
    year, quarter = best
    month = quarter * 3
    return date(year, month, calendar.monthrange(year, month)[1])


def default_start(archive: Archive) -> date | None:
    """The first day the bulk has not reached: the day after the latest quarter with a Contracte bulk file."""
    end = last_bulk_quarter_end(archive)
    return end + timedelta(days=1) if end else None


def plan_run(archive: Archive, *, today: date, first: date | None = None, last: date | None = None, start: date | None = None, force: bool = False) -> RunPlan:
    """The days to crawl. `today` is the current day; "yesterday" is the last day a nightly run crawls."""
    c = cursor(archive)
    if first is not None or last is not None:  # explicit range
        if first is None:
            raise CrawlError("--to needs --from")
        last = last or today - timedelta(days=1)
        if last > today:
            raise CrawlError(f"--to {last} is in the future")
        if first > last:
            raise CrawlError(f"--from {first} is after --to {last}")
        return RunPlan(days_between(first, last), frozenset(), c, first, last, force)
    last = today - timedelta(days=1)
    if c is None:
        first = start or default_start(archive)
        if first is None:
            raise CrawlError("no crawl cursor yet and no Contracte bulk file in the archive to start after: pass --start YYYY-MM-DD (or --from/--to)")
        recrawl: frozenset[date] = frozenset()
    else:
        first = c - timedelta(days=TRAILING_DAYS - 1)
        recrawl = frozenset(days_between(first, c))
    return RunPlan(days_between(first, last) if first <= last else [], recrawl, c, first, last, force)


def run_crawl(archive: Archive, crawler: Crawler, plan: RunPlan, progress: CrawlProgress, *, now: Callable[[], datetime] = lambda: datetime.now(timezone.utc)) -> RunSummary:
    """Crawl the planned days in order, stopping at the first failure. Progress lines and the status file follow the run."""
    summary = RunSummary(plan)
    today = now().astimezone(timezone.utc).date()
    trailing_from = min(plan.recrawl) if plan.recrawl else None
    progress.start(plan.first, plan.last, len(plan.days), plan.cursor, trailing_from, archive.root)
    done = complete_days(archive)  # read once (a listing of the whole archive); this run keeps it current as it goes
    try:
        for day in plan.days:
            fetched = done.get(day)
            if fetched is not None and not plan.force:
                if day not in plan.recrawl:
                    progress.day_skipped(day, "complete")
                    summary.skipped.append(day)
                    continue
                if fetched.date() == today:  # re-crawled already today (a restarted run): once a day is enough
                    progress.day_skipped(day, f"trailing day already re-crawled today, {fetched:%Y-%m-%d}")
                    summary.skipped.append(day)
                    continue
            progress.day_begin(day)
            result = crawler.crawl_unit(day.isoformat(), day, day)
            progress.day_done(day, result.notices, result.list_pages, result.contracts, result.path, result.resumed)
            done[day] = now()
            summary.crawled.append(day)
            summary.notices += result.notices
            summary.contracts += result.contracts
    except CrawlError as e:
        summary.failed, summary.error = day, str(e)
        progress.fail(e, cursor(archive))
        return summary
    except BaseException as e:  # a signal or a bug: say so in the status file, then let it propagate
        progress.fail(e, cursor(archive))
        raise
    progress.finish(cursor(archive))
    return summary
