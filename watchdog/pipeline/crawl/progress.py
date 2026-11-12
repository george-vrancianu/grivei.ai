"""Progress of an unattended `pipeline crawl`: timestamped log lines and a small status file, like the rebuild's (progress.py).

Lines on stdout, flushed one by one (no TTY tricks, so `tail -f` on a nohup log is current):

    2026-11-12T03:00:01+0200 crawl start from=2026-10-01 to=2026-11-11 days=42 (cursor 2026-10-31, trailing re-crawl from 2026-10-29) archive=... pid=...
    2026-11-12T03:00:02+0200 crawl day 2026-10-29 notices page 1/1 window=2026-10-29..2026-10-29 rows=812/812
    2026-11-12T03:00:40+0200 crawl day 2026-10-29 contracts 25/812 notices
    2026-11-12T03:06:10+0200 crawl day 2026-10-29 notices=812 pages=1 contracts=1290 archived=<path> in 368.0s
    2026-11-12T03:06:10+0200 crawl day 2026-10-30 skipped (complete, fetched 2026-11-12)
    2026-11-12T03:09:44+0200 crawl done days=42 crawled=40 skipped=2 notices=20111 contracts=30244 cursor=2026-11-11 in 0:09:43
    2026-11-12T03:00:09+0200 crawl FAILED day 2026-10-31: <reason>; cursor stays at 2026-10-30, rerun to resume

The status file (`<archive>/crawl-progress.json`, `--progress-file` / `PIPELINE_CRAWL_PROGRESS_FILE`) is rewritten after every
line through a temporary file and a rename. `pipeline status` reads it; a `running` file whose process is gone says interrupted.
"""
from __future__ import annotations

import json
import os
import socket
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, TextIO

from ..progress import STATUS_VERSION, _duration, _iso, stamp, write_atomically

DEFAULT_CRAWL_STATUS_NAME = "crawl-progress.json"


class CrawlProgress:
    """Reports a crawl run. `out` takes one finished line (default: stdout, flushed); `now` is injectable for tests."""

    def __init__(
        self,
        status_file: Path | None = None,
        out: Callable[[str], None] | None = None,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        stream: TextIO | None = None,
    ):
        self.status_file, self._now = status_file, now
        self._out = out or (lambda line: print(line, file=stream, flush=True))
        self.state: dict = {
            "version": STATUS_VERSION, "pid": os.getpid(), "host": socket.gethostname(), "state": "starting",
            "startedAt": _iso(now()), "updatedAt": _iso(now()), "from": None, "to": None, "total": 0, "done": 0,
            "crawled": 0, "skipped": 0, "notices": 0, "contracts": 0, "current": None, "cursor": None, "last": None, "error": None,
        }
        self._started = self._day_started = now()

    # ---- events ---------------------------------------------------------------------------------------------

    def start(self, first: date | None, last: date | None, total: int, cursor: date | None, trailing_from: date | None, archive: Path | str) -> None:
        self.state.update(state="running", total=total, cursor=_d(cursor), **{"from": _d(first), "to": _d(last)})
        trailing = f", trailing re-crawl from {trailing_from}" if trailing_from else ""
        self._line(f"crawl start from={first} to={last} days={total} (cursor {cursor or 'none'}{trailing}) archive={archive} pid={os.getpid()}")

    def day_begin(self, day: date) -> None:
        self._day_started = self._now()
        self.state["current"] = {"day": day.isoformat()}
        self._write()

    def note(self, text: str) -> None:
        """A page or batch line inside a day (also retries and splits)."""
        self._line(f"crawl {text}")

    def day_done(self, day: date, notices: int, pages: int, contracts: int, archived: Path | str, resumed: bool) -> None:
        took = (self._now() - self._day_started).total_seconds()
        s = self.state
        s.update(done=s["done"] + 1, crawled=s["crawled"] + 1, notices=s["notices"] + notices, contracts=s["contracts"] + contracts, current=None)
        tail = " (resumed)" if resumed else ""
        self._line(f"crawl day {day} notices={notices} pages={pages} contracts={contracts} archived={archived} in {took:.1f}s{tail}")

    def day_skipped(self, day: date, why: str) -> None:
        self.state.update(done=self.state["done"] + 1, skipped=self.state["skipped"] + 1)
        self._line(f"crawl day {day} skipped ({why})")

    def recrawl_failed(self, day: date, error: BaseException) -> None:
        s = self.state
        s.update(done=s["done"] + 1, current=None, recrawlFailed=[*s.get("recrawlFailed", []), day.isoformat()])
        self._line(f"crawl day {day} re-crawl FAILED: {error}; the earlier fetch stands")

    def finish(self, cursor: date | None) -> None:
        s = self.state
        s.update(state="finished", cursor=_d(cursor), current=None)
        took = _duration((self._now() - self._started).total_seconds())
        self._line(f"crawl done days={s['done']} crawled={s['crawled']} skipped={s['skipped']} notices={s['notices']} contracts={s['contracts']} cursor={cursor or 'none'} in {took}")

    def fail(self, error: BaseException, cursor: date | None) -> None:
        current = (self.state.get("current") or {}).get("day")
        self.state.update(state="failed", cursor=_d(cursor), error=f"{type(error).__name__}: {error}".strip(": "))
        where = f" day {current}" if current else ""
        try:
            self._line(f"crawl FAILED{where}: {self.state['error']}; cursor stays at {cursor or 'none'}, rerun to resume")
        except OSError:  # the status file cannot be written: the real cause must not be replaced by this one
            pass

    # ---- output ---------------------------------------------------------------------------------------------

    def _line(self, text: str) -> None:
        line = f"{stamp(self._now())} {text}"
        self.state["last"] = line
        self._out(line)  # printed before the status file is written: a failing write must not hide the line
        self._write()

    def _write(self) -> None:
        self.state["updatedAt"] = _iso(self._now())
        if self.status_file:
            write_atomically(self.status_file, json.dumps(self.state, indent=2, ensure_ascii=False) + "\n")


def _d(day: date | None) -> str | None:
    return day.isoformat() if day else None


def describe_crawl(status: dict | None, cursor: date | None, complete: int, alive: Callable[[int], bool] | None = None, host: str | None = None,
                   now: datetime | None = None, through: date | None = None, missing: list[date] | None = None) -> list[str]:
    """The crawl lines of `pipeline status`: the cursor and data-through dates (derived from the archive, live), then the last run."""
    from ..progress import _age, _alive, effective_state  # local: progress.py imports this module's siblings only for helpers

    lines = [
        f"crawl cursor: {cursor or 'none yet'} (the last day with a complete manifest; {complete} complete day(s) in the archive)",
        f"crawled through (archive, not yet rebuilt): {(through or cursor) or 'none'} (award notices and contracts: CONTRACT, AWARD_NOTICE)",
    ]
    if missing:
        shown = ", ".join(str(d) for d in missing[:10]) + (f" and {len(missing) - 10} more" if len(missing) > 10 else "")
        lines.append(f"missing day(s) below the cursor: {shown} (rerun with --from/--to to fill them)")
    if status is None:
        return lines + ["crawl run: none recorded"]
    state = effective_state(status, alive or _alive, host)
    lines.append(f"crawl run: {state if state != 'unknown' else 'running? (cannot see the process from here)'}"
                 f" days {status.get('done', 0)}/{status.get('total', 0)} ({status.get('crawled', 0)} crawled, {status.get('skipped', 0)} skipped),"
                 f" {status.get('notices', 0)} notices, {status.get('contracts', 0)} contracts")
    if state in ("running", "unknown") and status.get("current"):
        lines.append(f"crawl now: day {status['current']['day']}")
    lines.append(f"crawl started: {status.get('startedAt')}, updated: {status.get('updatedAt')} (pid {status.get('pid')} on {status.get('host', 'an unknown host')})")
    if state == "unknown":
        lines.append(f"crawl: written by another host or container; last update {_age(status, now or datetime.now(timezone.utc))} ago")
    if status.get("last"):
        lines.append(f"crawl last line: {status['last']}")
    if state == "interrupted":
        lines.append("the crawl is not running and did not finish: complete days are kept; rerun the same command to resume")
    if state == "failed":
        lines.append(f"crawl error: {status.get('error')}")
    return lines
