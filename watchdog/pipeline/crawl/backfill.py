"""`pipeline backfill` (#78): the one-off, resumable job that fills what neither the bulk files nor the nightly crawl hold.

It is built on the crawl core (`Crawler.crawl_unit`, #77: the same client, politeness, cap splitting, archive writing); its
only own parts are which windows to crawl, which list rows to keep, and the week bookkeeping. Two passes, by week:

- **2021-22** (2021-01-01 .. 2022-12-31): the national award-notice list, keeping only rows with `procedureId` null (negociere
  fara publicare prealabila, norme proprii, procedura simplificata proprie: contracts awarded without a prior call, which the
  2021-22 bulk files do not hold), then one contracts call per kept notice (~30k requests).
- **2023-today** (2023-01-01 ..): the notices the bulk files should hold but do not (notices re-dated after an edit, ~0.3%):
  rows whose award notice code is in neither the 2021-22 backfill nor any 2023+ bulk file of the archive. Decided against the
  raw archive, never the database (ADR 0004). A week is only listed when the bulk can answer for it, see `BulkIndex`.

A week is one archive unit of its own kind (`award-notices-backfill`, unitdir.BACKFILL_KIND), named by its first day, with the
usual manifest written last, so the nightly crawl's cursor and its days are untouched. A week is complete when a fetch of it has a
manifest for exactly the planned window; a rerun skips complete weeks, and an interrupted week resumes: every response it already
archived is reused (written as temp + rename, so a partial file never counts), only the missing requests are sent. State lives
in the archive, so it survives a rebuild; the progress file (backfill_progress.py) is only the last run's account.

Failures: a failing week stays incomplete (nothing is skipped silently) and the run goes on with the next week. After
MAX_CONSECUTIVE_FAILURES weeks in a row the service looks down: the run pauses (PAUSES, growing, seconds) and tries again, and
only gives up once it has paused for all of them and the next streak fails too. The first week that succeeds resets the streak
and the pauses. A rerun retries the failed weeks.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Callable

from ..archive import Archive
from ..bulk import InvalidFile, parse_file_stats
from .client import CrawlError
from .core import Crawler
from .backfill_progress import BackfillProgress
from .unitdir import BACKFILL_KIND, fetches, kind_dir, manifest_of

PASS_2021_22, PASS_2023_TODAY = "2021-22", "2023-today"
PASSES = (PASS_2021_22, PASS_2023_TODAY)
FIRST_DAY = date(2021, 1, 1)
LAST_DAY_2021_22 = date(2022, 12, 31)
FIRST_DAY_2023 = date(2023, 1, 1)
BULK_KINDS = ("contracte", "fara-anunt")  # the bulk files a Record of the crawled kinds can be in (CONTRACT, AWARD_NOTICE)
MAX_CONSECUTIVE_FAILURES = 5
PAUSES = (600, 1200, 2400)  # seconds slept, in turn, when a streak of failures says the service is down


# ---- weeks ------------------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Week:
    pass_name: str
    first: date
    last: date

    @property
    def unit(self) -> str:
        """The archive unit: the first day. (An ISO week label is not unique across the passes: 2022-W52 holds 2022-12-31 and 2023-01-01.)"""
        return self.first.isoformat()

    @property
    def label(self) -> str:
        iso = self.first.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"

    @property
    def window(self) -> list[str]:
        return [self.first.isoformat(), self.last.isoformat()]


def week_windows(first: date, last: date) -> list[tuple[date, date]]:
    """Monday-to-Sunday windows from `first` to `last`, the first and last clipped to the range."""
    out, day = [], first
    while day <= last:
        end = min(day + timedelta(days=6 - day.weekday()), last)
        out.append((day, end))
        day = end + timedelta(days=1)
    return out


def quarter_of(day: date) -> str:
    return f"{day.year}Q{(day.month - 1) // 3 + 1}"


# ---- what the archive holds ---------------------------------------------------------------------------------------


def complete_weeks(archive: Archive) -> dict[tuple[str, str], dict]:
    """(pass, unit) -> the `crawl` block of the latest complete fetch of that week, for every complete week the archive holds."""
    out: dict[tuple[str, str], dict] = {}
    base = kind_dir(archive, BACKFILL_KIND)
    if not base.is_dir():
        return out
    for unit_dir in sorted(base.iterdir()):
        for _, manifest in fetches(archive, unit_dir.name, BACKFILL_KIND):
            block = (manifest or {}).get("crawl") or {}
            if manifest and block.get("pass"):
                out[(block["pass"], unit_dir.name)] = block  # later fetches (sorted) replace earlier ones
    return out


def is_complete(held: dict, week: Week) -> bool:
    """A week is complete when a fetch of it covers exactly the planned window."""
    block = held.get((week.pass_name, week.unit))
    return bool(block) and block.get("window") == week.window


def archive_summary(archive: Archive) -> dict[str, dict]:
    """Per pass, from the manifests only: weeks complete, rows listed, notices kept, contracts fetched, last complete week (end day)."""
    out: dict[str, dict] = {}
    for (name, _), block in complete_weeks(archive).items():
        s = out.setdefault(name, {"weeks": 0, "listed": 0, "kept": 0, "contracts": 0, "last": None})
        s["weeks"] += 1
        s["listed"] += block.get("notices", 0)
        s["kept"] += block.get("kept", 0)
        s["contracts"] += block.get("contracts", 0)
        end = block["window"][1]
        s["last"] = max(s["last"] or end, end)
    return out


def backfilled_codes(archive: Archive) -> set[str]:
    """The award notice codes the 2021-22 backfill holds: the kept list rows of its complete weeks (read from the archived list pages)."""
    codes: set[str] = set()
    for (name, unit), block in complete_weeks(archive).items():
        if name != PASS_2021_22:
            continue
        for directory, manifest in fetches(archive, unit, BACKFILL_KIND):
            if manifest is None:
                continue
            for f in manifest["files"]:
                if f["name"].startswith("notices-"):
                    for row in json.loads((directory / f["name"]).read_text(encoding="utf-8")).get("items") or []:
                        if row.get("procedureId") is None and row.get("noticeNo"):
                            codes.add(str(row["noticeNo"]).strip())
    return codes


class BulkIndex:
    """What the 2023+ bulk files of the raw archive hold: the award notice codes, and which (kind, quarter) pairs answer for their quarter.

    Read the way the rebuild reads them (`parse_file_stats`, a file that fails validation counts as absent: the rebuild would
    quarantine it), from the raw archive only, never the database (ADR 0004). A notice's Record identity is its award notice code
    (an AWARD_NOTICE) or `<code>~<contract number>` (a CONTRACT, `bulk.records.contract_code`); both begin with `notice_code`, and a
    notice is "in the bulk" when its code is (the list row has no contract number: that takes a contracts call).
    """

    def __init__(self, covered: set[tuple[str, str]], codes: set[str]):
        self.covered, self.codes = covered, codes

    def answers_for(self, day: date) -> list[str]:
        """The (kind, quarter) pairs missing for this day: empty when both bulk kinds of its quarter are in."""
        q = quarter_of(day)
        return [f"{k} {q}" for k in BULK_KINDS if (k, q) not in self.covered]

    @classmethod
    def read(cls, archive: Archive, note: Callable[[str], None] = lambda text: None, first_quarter: str = "2023Q1") -> "BulkIndex":
        covered: set[tuple[str, str]] = set()
        codes: set[str] = set()
        for kind in BULK_KINDS:
            base = archive.root / "seap" / "bulk" / kind
            if not base.is_dir():
                continue
            for unit_dir in sorted(base.iterdir()):
                if not re.fullmatch(r"\d{4}Q[1-4]", unit_dir.name) or unit_dir.name < first_quarter:
                    continue
                before = len(codes)
                ok = False
                for directory in sorted(d for d in unit_dir.iterdir() if d.is_dir()):
                    manifest = manifest_of(directory)
                    for f in (manifest or {}).get("files", []):
                        try:
                            for record in parse_file_stats(kind, unit_dir.name, directory / f["name"]).records:
                                if record.notice_code:
                                    codes.add(record.notice_code)
                            ok = True
                        except InvalidFile as e:
                            note(f"bulk {kind} {unit_dir.name} {f['name']} is not valid ({e.reason}): counted as absent")
                if ok:
                    covered.add((kind, unit_dir.name))
                    note(f"bulk {kind} {unit_dir.name}: {len(codes) - before} new notice codes")
        return cls(covered, codes)


# ---- the plan -----------------------------------------------------------------------------------------------------


@dataclass
class PassPlan:
    name: str
    weeks: list[Week]
    done: list[Week] = field(default_factory=list)  # already complete
    waiting: dict[Week, str] = field(default_factory=dict)  # cannot be decided yet: why
    todo: list[Week] = field(default_factory=list)

    @property
    def to_do(self) -> int:
        return len(self.todo)


def plan_backfill(archive: Archive, *, today: date, passes: tuple[str, ...] = PASSES, bulk: BulkIndex | None = None) -> list[PassPlan]:
    """Which weeks each pass still has to crawl. `bulk` is only needed (and only read) for the 2023-today pass."""
    held = complete_weeks(archive)
    plans = []
    for name in passes:
        if name == PASS_2021_22:
            weeks = [Week(name, a, b) for a, b in week_windows(FIRST_DAY, LAST_DAY_2021_22)]
        else:  # whole weeks only: a week that is not over would be marked complete short of its last days (the nightly crawl has those)
            weeks = [Week(name, a, b) for a, b in week_windows(FIRST_DAY_2023, today - timedelta(days=1)) if b.weekday() == 6]
        plan = PassPlan(name, weeks)
        for w in weeks:
            if is_complete(held, w):
                plan.done.append(w)
            elif name == PASS_2023_TODAY and (missing := _missing_bulk(w, bulk)):
                plan.waiting[w] = "no bulk archived for " + ", ".join(missing)
            else:
                plan.todo.append(w)
        plans.append(plan)
    return plans


def _missing_bulk(week: Week, bulk: BulkIndex | None) -> list[str]:
    if bulk is None:
        return ["any bulk file"]
    out = bulk.answers_for(week.first)
    return out + [m for m in bulk.answers_for(week.last) if m not in out]


# ---- the run ------------------------------------------------------------------------------------------------------


@dataclass
class BackfillSummary:
    plans: list[PassPlan]
    crawled: int = 0
    skipped: int = 0
    waiting: int = 0
    failed: list[Week] = field(default_factory=list)
    aborted: str | None = None

    @property
    def ok(self) -> bool:
        return not self.failed and self.aborted is None


def procedure_is_null(row: dict) -> bool:
    return row.get("procedureId") is None


def run_backfill(archive: Archive, crawler: Crawler, plans: list[PassPlan], progress: BackfillProgress, *,
                 bulk: BulkIndex | None = None, sleep: Callable[[float], None] = time.sleep) -> BackfillSummary:
    """Crawl the planned weeks, pass by pass. A failing week is recorded and the run goes on; see the module docstring."""
    summary = BackfillSummary(plans)
    progress.start(plans, archive.root)
    consecutive = pauses = 0
    pass2_keep: Callable[[dict], bool] | None = None  # built once, when the first week of that pass starts
    try:
        for plan in plans:
            progress.begin_pass(plan)
            for week in plan.weeks:
                if week in plan.done:
                    progress.week_skipped(week, "complete")
                    summary.skipped += 1
                    continue
                if week in plan.waiting:
                    progress.week_waiting(week, plan.waiting[week])
                    summary.waiting += 1
                    continue
                progress.week_begin(week)
                if plan.name == PASS_2021_22:
                    keep = procedure_is_null
                else:
                    pass2_keep = pass2_keep or _not_in_bulk_or_backfill(archive, bulk)
                    keep = pass2_keep
                try:
                    result = crawler.crawl_unit(week.unit, week.first, week.last, keep=keep, meta={"pass": week.pass_name, "week": week.label})
                except CrawlError as e:
                    progress.week_failed(week, e)
                    summary.failed.append(week)
                    consecutive += 1
                    if consecutive >= MAX_CONSECUTIVE_FAILURES:
                        if pauses >= len(PAUSES):
                            summary.aborted = f"{consecutive} weeks failed in a row after {pauses} pauses; the service looks down. Complete weeks are kept: rerun later to resume"
                            progress.finish(summary.aborted)
                            return summary
                        progress.paused(consecutive, PAUSES[pauses])
                        sleep(PAUSES[pauses])
                        pauses += 1
                        consecutive = 0
                    continue
                consecutive = pauses = 0
                progress.week_done(week, result)
                summary.crawled += 1
    except BaseException as e:  # a signal or a bug: the status file says so, then it propagates
        progress.fail(e)
        raise
    progress.finish()
    return summary


def _not_in_bulk_or_backfill(archive: Archive, bulk: BulkIndex | None) -> Callable[[dict], bool]:
    """The 2023-today keep hook: a row is kept when its notice code is in neither the 2021-22 backfill nor a 2023+ bulk file."""
    known = backfilled_codes(archive) | (bulk.codes if bulk else set())

    def missing_from_bulk_and_backfill(row: dict) -> bool:
        return str(row.get("noticeNo") or "").strip() not in known

    return missing_from_bulk_and_backfill
