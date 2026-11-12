"""Progress of an unattended `pipeline backfill` (#78): timestamped log lines and a small status file, like the crawl's.

Lines on stdout, flushed one by one (no TTY tricks, so `tail -f` on a nohup log is current):

    2026-11-12T10:00:01+0200 backfill start passes=2021-22,2023-today weeks=105/117 to do (waiting for bulk: 12) archive=... pid=...
    2026-11-12T10:00:01+0200 backfill pass 2021-22 weeks=105 (done 0, to do 105)
    2026-11-12T10:00:03+0200 backfill unit 2021-04-05 notices page 1 window=2021-04-05..2021-04-11 rows=812/812
    2026-11-12T10:03:10+0200 backfill unit 2021-04-05 contracts 25/37 notices
    2026-11-12T10:04:10+0200 backfill week 2021-W14 2021-04-05..2021-04-11 listed=812 kept=37 contracts=41 pages=1 requests=78 in 187.0s (pass 2021-22 week 1/105, eta 5:23:10)
    2026-11-12T10:04:10+0200 backfill week 2021-W15 2021-04-12..2021-04-18 skipped (complete)
    2026-11-12T10:04:10+0200 backfill week 2023-W14 2023-04-03..2023-04-09 waiting (no bulk archived for 2023Q2 contracte)
    2026-11-12T10:04:10+0200 backfill week 2021-W16 2021-04-19..2021-04-25 FAILED: <reason>; the week stays incomplete, rerun to resume
    2026-11-12T18:00:00+0200 backfill done weeks=222 crawled=100 skipped=90 waiting=30 failed=2 listed=... kept=... contracts=... requests=... in 7:55:59

The status file (`<archive>/backfill-progress.json`, `--progress-file` / `PIPELINE_BACKFILL_PROGRESS_FILE`) is rewritten after
every line through a temporary file and a rename. `pipeline backfill --status` and `pipeline status` read it, plus the weeks the
archive itself holds complete (those are the truth after a kill; the file is the last run's account of it).
"""
from __future__ import annotations

import json
import os
import socket
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, TextIO

from ..progress import STATUS_VERSION, _age, _alive, _duration, _iso, effective_state, stamp, write_atomically

DEFAULT_BACKFILL_STATUS_NAME = "backfill-progress.json"
COUNTERS = ("total", "done", "crawled", "skipped", "waiting", "failed", "listed", "kept", "contracts", "requests")


class BackfillProgress:
    """Reports a backfill run. `out` takes one finished line (default: stdout, flushed); `now` is injectable for tests."""

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
            "startedAt": _iso(now()), "updatedAt": _iso(now()), "passes": {}, "current": None, "lastCompleteWeek": None,
            "failures": [], "last": None, "error": None, "eta": None,
        }
        self._started = self._week_started = now()
        self._crawled_seconds, self._todo = 0.0, 0
        self._pass = ""

    # ---- events ---------------------------------------------------------------------------------------------

    def start(self, plans: list, archive: Path | str) -> None:
        """`plans`: the PassPlan list (name, weeks, done, waiting)."""
        for p in plans:
            self.state["passes"][p.name] = dict.fromkeys(COUNTERS, 0) | {"total": len(p.weeks)}
        self._todo = sum(p.to_do for p in plans)
        self.state["state"] = "running"
        waiting = sum(len(p.waiting) for p in plans)
        tail = f" (waiting for bulk: {waiting})" if waiting else ""
        self._line(f"backfill start passes={','.join(p.name for p in plans)} weeks={sum(len(p.weeks) for p in plans)} to_do={self._todo}{tail} archive={archive} pid={os.getpid()}")

    def begin_pass(self, plan) -> None:
        self._pass = plan.name
        self._line(f"backfill pass {plan.name} weeks={len(plan.weeks)} (complete {len(plan.done)}, waiting for bulk {len(plan.waiting)}, to do {plan.to_do})")

    def week_begin(self, week) -> None:
        self._week_started = self._now()
        self.state["current"] = {"pass": week.pass_name, "week": week.label, "window": f"{week.first}..{week.last}"}
        self._write()

    def note(self, text: str) -> None:
        """A page or batch line inside a week (also retries and splits)."""
        self._line(f"backfill {text}")

    def week_done(self, week, result) -> None:
        took = (self._now() - self._week_started).total_seconds()
        c = self._counts(week)
        c.update(done=c["done"] + 1, crawled=c["crawled"] + 1, listed=c["listed"] + result.notices, kept=c["kept"] + result.kept,
                 contracts=c["contracts"] + result.contracts, requests=c["requests"] + result.requests)
        self.state.update(current=None, lastCompleteWeek={"pass": week.pass_name, "week": week.label, "window": f"{week.first}..{week.last}"})
        self._crawled_seconds += took
        self._todo -= 1
        eta = self._eta()
        self.state["eta"] = eta
        tail = " (resumed)" if result.resumed else ""
        n = c["done"]
        self._line(f"backfill week {week.label} {week.first}..{week.last} listed={result.notices} kept={result.kept} contracts={result.contracts} "
                   f"pages={result.list_pages} requests={result.requests} in {took:.1f}s{tail} (pass {week.pass_name} week {n}/{c['total']}" + (f", eta {eta})" if eta else ")"))

    def week_skipped(self, week, why: str) -> None:
        c = self._counts(week)
        c.update(done=c["done"] + 1, skipped=c["skipped"] + 1)
        self._line(f"backfill week {week.label} {week.first}..{week.last} skipped ({why})")

    def week_waiting(self, week, why: str) -> None:
        c = self._counts(week)
        c.update(waiting=c["waiting"] + 1)
        self._line(f"backfill week {week.label} {week.first}..{week.last} waiting ({why})")

    def week_failed(self, week, error: BaseException) -> None:
        c = self._counts(week)
        c.update(failed=c["failed"] + 1)
        self._todo -= 1
        self.state.update(current=None, failures=[*self.state["failures"], {"pass": week.pass_name, "week": week.label, "error": str(error)}][-50:])
        self._line(f"backfill week {week.label} {week.first}..{week.last} FAILED: {error}; the week stays incomplete (archived files are kept), rerun to resume")

    def finish(self, aborted: str | None = None) -> None:
        t = {k: sum(p[k] for p in self.state["passes"].values()) for k in COUNTERS}
        self.state.update(state="aborted" if aborted else "finished", current=None, eta=None)
        took = _duration((self._now() - self._started).total_seconds())
        tail = f" ABORTED: {aborted}" if aborted else ""
        self._line(f"backfill done weeks={t['done'] + t['waiting'] + t['failed']}/{t['total']} crawled={t['crawled']} skipped={t['skipped']} waiting={t['waiting']} failed={t['failed']} "
                   f"listed={t['listed']} kept={t['kept']} contracts={t['contracts']} requests={t['requests']} in {took}{tail}")

    def fail(self, error: BaseException) -> None:
        current = self.state.get("current")
        self.state.update(state="failed", error=f"{type(error).__name__}: {error}".strip(": "))
        where = f" week {current['week']}" if current else ""
        try:
            self._line(f"backfill FAILED{where}: {self.state['error']}; complete weeks are kept, rerun the same command to resume")
        except OSError:  # the status file cannot be written: the real cause must not be replaced by this one
            pass

    # ---- output ---------------------------------------------------------------------------------------------

    def _counts(self, week) -> dict:
        return self.state["passes"][week.pass_name]

    def _eta(self) -> str | None:
        """Remaining weeks to crawl at the average pace of the weeks crawled in this run (None until there is a pace)."""
        crawled = sum(p["crawled"] for p in self.state["passes"].values())
        if not crawled or self._todo <= 0:
            return None
        return _duration(self._crawled_seconds / crawled * self._todo)

    def _line(self, text: str) -> None:
        line = f"{stamp(self._now())} {text}"
        self.state["last"] = line
        self._out(line)  # printed before the status file is written: a failing write must not hide the line
        self._write()

    def _write(self) -> None:
        self.state["updatedAt"] = _iso(self._now())
        if self.status_file:
            write_atomically(self.status_file, json.dumps(self.state, indent=2, ensure_ascii=False) + "\n")


def describe_backfill(status: dict | None, held: dict[str, dict], totals: dict[str, int], alive: Callable[[int], bool] | None = None,
                      host: str | None = None, now: datetime | None = None) -> list[str]:
    """The backfill lines of `pipeline status` / `pipeline backfill --status`.

    `held` is what the archive itself holds per pass (`backfill.archive_summary`: complete weeks, kept notices, contracts, last
    week): the truth after a kill. `totals` is the number of weeks per pass the last run planned (a pass without a plan yet: absent).
    `status` is the last run's status file (or None)."""
    lines = []
    for name in sorted(set(held) | set(totals)):
        h = held.get(name, {})
        total = totals.get(name)
        lines.append(f"backfill pass {name}: weeks complete {h.get('weeks', 0)}/{total if total is not None else '?'}, {h.get('kept', 0)} notices kept of {h.get('listed', 0)} listed, "
                     f"{h.get('contracts', 0)} contracts fetched, last complete week {h.get('last') or 'none'}")
    if status is None:
        return lines + ["backfill run: none recorded"]
    state = effective_state(status, alive or _alive, host)
    shown = {"unknown": "running? (cannot see the process from here)"}.get(state, state)
    lines.append(f"backfill run: {shown}")
    for name, c in status.get("passes", {}).items():
        lines.append(f"backfill run pass {name}: {c['done']}/{c['total']} weeks ({c['crawled']} crawled, {c['skipped']} already complete, {c['waiting']} waiting for bulk, "
                     f"{c['failed']} failed), {c['kept']} kept, {c['contracts']} contracts, {c['requests']} requests")
    if state in ("running", "unknown") and status.get("current"):
        c = status["current"]
        lines.append(f"backfill now: week {c['week']} {c['window']} (pass {c['pass']})" + (f", eta {status['eta']}" if status.get("eta") else ""))
    if status.get("failures"):
        lines.append(f"backfill failures ({len(status['failures'])}, rerun retries them): " + "; ".join(f"{f['week']}: {f['error']}"[:120] for f in status["failures"][-3:]))
    lines.append(f"backfill started: {status.get('startedAt')}, updated: {status.get('updatedAt')} (pid {status.get('pid')} on {status.get('host', 'an unknown host')})")
    if state == "unknown":
        lines.append(f"backfill: written by another host or container; last update {_age(status, now or datetime.now(timezone.utc))} ago")
    if status.get("last"):
        lines.append(f"backfill last line: {status['last']}")
    if state == "interrupted":
        lines.append("the backfill is not running and did not finish: complete weeks are kept; rerun the same command to resume")
    if state in ("failed", "aborted"):
        lines.append(f"backfill error: {status.get('error') or 'stopped after repeated failures'}")
    return lines
