"""`pipeline refresh` (#28, #81): one locked run, each step due from its own last success.

Order: crawl -> data.gov.ro check (bulk files + the MF list) -> ONRC -> ANAF -> load. The spec numbers the load before ANAF; ANAF runs first here
on purpose: the load reads the archived ANAF answers, so placement is right on the first load after new CUIs arrive (deviation, README).
Step 5 of the spec (#82, backup.py): `backup` (restic of the archive, nightly) and `pgdump` (weekly) follow `load`; unconfigured they skip with a warning.

Due rules (a calendar day is a UTC day, so a 03:00 timer and an on-boot trigger the same day never both run a step):
- crawl: no success today. data.gov.ro: 7 days since the last success.
- ONRC (#175): 28 days since the last success, or 7 when no snapshot of the current month is held yet (the register publishes in the first days of a month).
- ANAF: the archive gained units other than ANAF answers since the last ANAF success, or 7 days passed (the 365-day re-check rides on that).
- load: the archive's units changed since the last load (new files, a requeue), or it never ran.
- backup: no success today; pgdump: 7 days since the last success. A skipped run (no RESTIC_REPOSITORY) counts as no success.

Failure classes (a step's exception is classed by `classify`):
- transient (network, database not ready): retried with backoff inside the run; the run fails if it still fails, and an alert goes out only
  after more than 2 consecutive failed runs. The step stays due, so the next trigger retries it.
- deterministic (a bug, a file nobody can read, a missing precondition): no retry, a `/fail` ping at once.
- suspicious success (the step ran but its result needs a look: a quarantined file, a possibly-incomplete quarter): the run is a success,
  the warning goes in the success ping and the status.
"""
from __future__ import annotations

import errno
import fcntl
import json
import sys
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import requests

from ..anaf import AnafUnavailable
from ..archive import QUARANTINE_DIR, Archive
from ..crawl import CrawlError
from ..onrc.fetch import held_snapshots
from .ledger import LEDGER_NAME, Ledger, parse, stamp
from .pings import Pinger

LOCK_NAME = "refresh.lock"
BACKOFF = (60, 300)  # seconds slept before the 2nd and the 3rd attempt of a transient failure
DATAGOV_EVERY_DAYS = 7
ANAF_EVERY_DAYS = 7
ONRC_EVERY_DAYS = 28
ONRC_RETRY_DAYS = 7
PGDUMP_EVERY_DAYS = 7
ALERT_AFTER_FAILED_RUNS = 2  # alert when MORE than this many runs in a row failed


class TransientError(Exception):
    """Worth retrying: the world was unreachable or busy."""


class DeterministicError(Exception):
    """Retrying cannot help: the same input fails the same way."""


def classify(error: BaseException) -> str:
    if isinstance(error, TransientError):
        return "transient"
    if isinstance(error, DeterministicError):
        return "deterministic"
    if isinstance(error, (requests.RequestException, CrawlError, AnafUnavailable, ConnectionError, TimeoutError)):
        return "transient"
    # a full disk or a file nobody can read does not clear by itself: deterministic, alert at once
    if isinstance(error, OSError) and not isinstance(error, (FileNotFoundError, PermissionError, IsADirectoryError, NotADirectoryError)) and error.errno != errno.ENOSPC:
        return "transient"
    if type(error).__module__.startswith("psycopg") and type(error).__name__ in ("OperationalError", "InterfaceError"):
        return "transient"
    return "deterministic"


@dataclass
class StepResult:
    counts: dict = field(default_factory=dict)
    touched: list[str] = field(default_factory=list)  # archive paths the step wrote (relative to the archive root where it can)
    warnings: list[str] = field(default_factory=list)  # suspicious success


@dataclass
class Step:
    name: str
    run: Callable[[], StepResult]
    due: Callable[[Ledger, datetime], str | None]  # the reason it is due, None when it is not
    marker: Callable[[], object] | None = None  # recorded on success; `due` reads it back from the ledger


@dataclass
class RefreshResult:
    status: str  # ok | failed | locked
    run: dict | None = None
    alert: str | None = None

    @property
    def exit_code(self) -> int:
        return 1 if self.status == "failed" else 0


def archive_fingerprint(archive: Archive, *, without_source: str | None = None, quarantine_apart: bool = True) -> dict[str, int]:
    """Fetch directories per source: a cheap "did the archive change" check (nothing is hashed).

    Quarantined units are one more key (`_quarantine`), so a requeue changes the fingerprint; with `quarantine_apart=False` they count
    under their source instead, so a load that moves a unit to quarantine leaves it as it was."""
    counts: dict[str, int] = {}
    for directory in archive.fetch_dirs():
        source = directory.relative_to(archive.root).parts[0]
        if source != without_source:
            counts[source] = counts.get(source, 0) + 1
    for path in archive.quarantined():
        parts = path.relative_to(archive.root / QUARANTINE_DIR).parts
        key = "_quarantine" if quarantine_apart else parts[0]
        if parts[0] != without_source:
            counts[key] = counts.get(key, 0) + 1
    return counts


def _days_since(step: dict, now: datetime) -> int:
    return (now.astimezone(timezone.utc).date() - parse(step["ended"]).date()).days


def _markers(archive: Archive) -> tuple[Callable[[], dict], Callable[[], dict]]:
    """The markers of the ANAF and the load step, one definition for the refresh and the seed (a refresh after a seed finds both up to date)."""
    return (lambda: archive_fingerprint(archive, without_source="anaf", quarantine_apart=False)), (lambda: archive_fingerprint(archive))


def refresh_steps(archive: Archive, impl) -> list[Step]:
    """The steps of a refresh. `impl` has `crawl()`, `datagov()`, `anaf()`, `load()`, each returning a `StepResult`."""
    fingerprint_no_anaf, fingerprint_all = _markers(archive)

    def daily(ledger: Ledger, now: datetime, name="crawl") -> str | None:
        last = ledger.last_success(name)
        if last is None:
            return "never ran"
        return None if _days_since(last, now) < 1 else f"last success {last['ended']}"

    def weekly(name: str, days: int):
        def due(ledger: Ledger, now: datetime) -> str | None:
            last = ledger.last_success(name)
            if last is None:
                return "never ran"
            return f"last success {last['ended']}, {days} days passed" if _days_since(last, now) >= days else None
        return due

    def onrc_due(ledger: Ledger, now: datetime) -> str | None:
        """Monthly, from the last success: every 28 days, or after a week when this month's snapshot is not held yet (ONRC publishes in the first days of a month)."""
        last = ledger.last_success("onrc")
        if last is None:
            return "never ran"
        days = _days_since(last, now)
        if days >= ONRC_EVERY_DAYS:
            return f"last success {last['ended']}, {ONRC_EVERY_DAYS} days passed"
        month = (now.astimezone(timezone.utc).year, now.astimezone(timezone.utc).month)
        if days >= ONRC_RETRY_DAYS and not any(tuple(map(int, d.split("-")[:2])) == month for d in held_snapshots(archive)):
            return f"last success {last['ended']}, no snapshot of this month held yet"
        return None

    def anaf_due(ledger: Ledger, now: datetime) -> str | None:
        last = ledger.last_success("anaf")
        if last is None:
            return "never ran"
        if last.get("marker") != fingerprint_no_anaf():
            return "new files in the archive"
        return f"last success {last['ended']}, {ANAF_EVERY_DAYS} days passed" if _days_since(last, now) >= ANAF_EVERY_DAYS else None

    def load_due(ledger: Ledger, now: datetime) -> str | None:
        last = ledger.last_success("load")
        if last is None:
            return "never ran"
        return "the archive changed since the last load" if last.get("marker") != fingerprint_all() else None

    def unless_skipped(name, due):
        """A step that skipped (not configured) did not back anything up: it stays due, so configuring it takes effect on the next trigger."""
        def wrapped(ledger: Ledger, now: datetime) -> str | None:
            last = ledger.last_success(name)
            if last is not None and last.get("counts", {}).get("skipped"):
                return "skipped last time (not configured)"
            return due(ledger, now)
        return wrapped

    backup_due, dump_due = (lambda l, n: daily(l, n, "backup")), weekly("pgdump", PGDUMP_EVERY_DAYS)

    backups = [Step(name, getattr(impl, name), unless_skipped(name, due)) for name, due in (("backup", backup_due), ("pgdump", dump_due))]

    return [
        Step("crawl", impl.crawl, daily),
        Step("datagov", impl.datagov, weekly("datagov", DATAGOV_EVERY_DAYS)),
        Step("onrc", impl.onrc, onrc_due),  # its own step (#175): ONRC failing never blocks SEAP's; its snapshots change the archive, so the load follows
        Step("anaf", impl.anaf, anaf_due, fingerprint_no_anaf),
        Step("load", impl.load, load_due, fingerprint_all),
        *backups,  # step 5 (#82): the raw archive to restic nightly, a pg_dump of the graph weekly, same repository
    ]


def seed_steps(archive: Archive, impl, backfill: bool) -> list[Step]:
    """The first-time sequence: data.gov.ro + MF list, ANAF, load, optionally the 2021-22 backfill. Done = succeeded once in a seed run."""
    def not_done(name):
        return lambda ledger, now: None if ledger.last_success(name, "seed") else "not done yet"

    # the markers are the refresh's: after a seed, the first refresh finds ANAF and the load up to date
    marker_anaf, marker_load = _markers(archive)
    steps = [Step("datagov", impl.datagov, not_done("datagov")),
             Step("onrc", impl.onrc, not_done("onrc")),
             Step("anaf", impl.anaf, not_done("anaf"), marker_anaf),
             Step("load", impl.load, not_done("load"), marker_load)]
    if backfill:
        steps.append(Step("backfill", impl.backfill, not_done("backfill")))
    return steps


@contextmanager
def locked(archive: Archive):
    """The one lock of the pipeline's long runs (refresh and seed). Yields False when another process holds it."""
    archive.root.mkdir(parents=True, exist_ok=True)
    with open(archive.root / LOCK_NAME, "a+") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as e:
            if e.errno not in (errno.EAGAIN, errno.EACCES):
                raise
            yield False
            return
        try:
            yield True
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def _say_default(line: str) -> None:
    print(f"{stamp(datetime.now(timezone.utc))} {line}", flush=True)


def _unit_paths(archive: Archive) -> set[str]:
    return {str(d.relative_to(archive.root)) for d in archive.fetch_dirs()}


def _execute(archive: Archive, step: Step, ledger: Ledger, run: dict, now: Callable[[], datetime], sleep: Callable[[float], None], say) -> dict:
    previous = ledger.last_success(step.name)
    known = set((previous or {}).get("allWarnings", (previous or {}).get("warnings", [])))  # what the last success already reported
    record = ledger.begin_step(run, step.name, now())
    before = _unit_paths(archive)
    say(f"step {step.name}: start")
    for attempt in range(1, len(BACKOFF) + 2):
        record["attempts"] = attempt
        try:
            result = step.run()
        except Exception as e:  # noqa: BLE001 - classed below; SystemExit and KeyboardInterrupt propagate
            kind = classify(e)
            record.update(failureClass=kind, error=f"{type(e).__name__}: {e}"[:500])
            say(f"step {step.name}: {kind} failure (attempt {attempt}): {record['error']}")
            if kind == "transient" and attempt <= len(BACKOFF):
                wait = BACKOFF[attempt - 1]
                say(f"step {step.name}: retrying in {wait}s")
                ledger.save()
                sleep(wait)
                continue
            record.update(status="failed", ended=stamp(now()))
            ledger.save()
            return record
        record.update(status="ok", ended=stamp(now()), counts=result.counts, touched=sorted(set(result.touched) | (_unit_paths(archive) - before))[:200],
                      warnings=[w for w in result.warnings if w not in known], allWarnings=result.warnings,  # only a warning that is new makes a success "suspicious"
                      failureClass=None, error=None, marker=step.marker() if step.marker else None)
        for warning in result.warnings:
            say(f"step {step.name}: warning: {warning}" + ("" if warning not in known else " (as before)"))
        say(f"step {step.name}: ok {json.dumps(result.counts, sort_keys=True)}")
        ledger.save()
        return record
    raise AssertionError("unreachable")


def _run(archive: Archive, kind: str, trigger: str, build_steps, pinger: Pinger | None, now, sleep, say, ledger_path: Path | None, *, stop_on_failure: bool = False) -> RefreshResult:
    with locked(archive) as got:
        if not got:
            say(f"{kind}: another run holds {archive.root / LOCK_NAME}; nothing to do")
            return RefreshResult("locked")
        ledger = Ledger(ledger_path or archive.root / LEDGER_NAME)
        ledger.close_dead_runs(now())
        run = ledger.begin(kind, trigger, now())
        say(f"{kind} run {run['id']} started ({trigger})")
        try:
            ran = 0
            for step in build_steps():
                reason = step.due(ledger, now())
                if reason is None:
                    say(f"step {step.name}: not due")
                    continue
                say(f"step {step.name}: due ({reason})")
                record = _execute(archive, step, ledger, run, now, sleep, say)
                ran += 1
                if record["status"] == "failed" and stop_on_failure:
                    say(f"step {step.name} failed: the {kind} stops here, so a resumed {kind} starts at this step; the steps after it did not run")
                    break
        except BaseException as e:  # a kill or a bug in the engine: the ledger says so, then the error goes up
            run.update(status="interrupted", ended=stamp(now()))
            for s in run["steps"]:
                if s["status"] == "running":
                    s.update(status="interrupted", ended=stamp(now()))
            ledger.save()
            if pinger is not None and isinstance(e, Exception):  # a bug in the engine or in a step's `due`: say so now, not when the dead-man's switch trips
                pinger.fail(f"refresh engine error: {type(e).__name__}: {e}"[:500])
            raise
        failed = [s for s in run["steps"] if s["status"] == "failed"]
        warnings = [f"{s['name']}: {w}" for s in run["steps"] for w in s["warnings"]]
        run.update(status="failed" if failed else "ok", ended=stamp(now()))
        alert = _alert(kind, run, failed, warnings, ledger, pinger, say, ran)
        run["alert"] = alert
        ledger.save()
        say(f"{kind} run {run['id']} {run['status']}" + (f"; alert: {alert}" if alert else ""))
        return RefreshResult(run["status"], run, alert)


def _alert(kind: str, run: dict, failed: list[dict], warnings: list[str], ledger: Ledger, pinger: Pinger | None, say, ran: int) -> str | None:
    if pinger is None:  # seed: the operator is watching the log
        return None
    deterministic = [s for s in failed if s["failureClass"] == "deterministic"]
    if deterministic:
        reason = "deterministic failure: " + "; ".join(f"{s['name']}: {s['error']}" for s in deterministic)
        pinger.fail(reason)
        return reason
    if failed:
        streak = ledger.consecutive_failed_runs()
        if streak > ALERT_AFTER_FAILED_RUNS:
            reason = f"transient failure, {streak} failed runs in a row: " + "; ".join(f"{s['name']}: {s['error']}" for s in failed)
            pinger.fail(reason)
            return reason
        say(f"transient failure, run {streak} of the {ALERT_AFTER_FAILED_RUNS + 1} that raise an alert; the next trigger retries")
        return None
    body = f"refresh ok, {ran} step(s) ran" if ran else "refresh ok, nothing due"
    if warnings:
        body += "\nsuspicious success, loaded with warnings:\n" + "\n".join(warnings)
    pinger.success(body)
    return None


def run_refresh(archive: Archive, impl, *, pinger: Pinger | None = None, trigger: str = "manual", now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
                sleep: Callable[[float], None] | None = None, say: Callable[[str], None] = _say_default, ledger_path: Path | None = None) -> RefreshResult:
    import time
    return _run(archive, "refresh", trigger, lambda: refresh_steps(archive, impl), pinger or Pinger(None), now, sleep or time.sleep, say, ledger_path)


def run_seed(archive: Archive, impl, *, backfill: bool = False, again: bool = False, now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
             sleep: Callable[[float], None] | None = None, say: Callable[[str], None] = _say_default, ledger_path: Path | None = None) -> RefreshResult:
    """The seed: each step skipped once it succeeded in an earlier seed run (`again` forgets that); it stops at the first failed step,
    so a resumed seed continues there and never skips a step that came after a failure. No pings."""
    import time
    def build():
        steps = seed_steps(archive, impl, backfill)
        if again:
            for s in steps:
                s.due = lambda ledger, now_: "again"
        return steps
    return _run(archive, "seed", "manual", build, None, now, sleep or time.sleep, say, ledger_path, stop_on_failure=True)
