"""The real steps of a refresh or a seed: thin wrappers that call the verbs' own code and turn what happened into a `StepResult`.

Every network or database dependency comes in as a callable, so `cli.py` passes the real ones (and Seam 2 tests replace them)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable

from ..anaf import AnafClient, AnafProgress, collect_cuis, lookup
from ..archive import Archive
from ..crawl import CrawlError, CrawlProgress, Crawler, plan_run, run_crawl
from ..onrc.fetch import held_snapshots
from .engine import DeterministicError, StepResult, TransientError

RECHECK_ANAF_AFTER_DAYS = 365
ONRC_STALE_AFTER_DAYS = 70  # ONRC publishes monthly: a newest snapshot older than this means the dataset stopped (suspicious success)


def _onrc_stale(archive: Archive, now: datetime) -> str | None:
    held = sorted(held_snapshots(archive))
    if held and (now.astimezone(timezone.utc).date() - date.fromisoformat(held[-1])).days > ONRC_STALE_AFTER_DAYS:
        return f"the newest ONRC snapshot held is {held[-1]}, more than {ONRC_STALE_AFTER_DAYS} days old: the register may have stopped publishing"
    return None


@dataclass
class Impl:
    archive: Archive
    say: Callable[[str], None]
    make_client: Callable  # (delay, log) -> EliClient
    fetch_datagov: Callable  # (archive) -> FetchSummary
    fetch_mf: Callable  # (archive) -> MfFetchSummary
    anaf_client: Callable[[], AnafClient]
    load_fn: Callable[[], object]  # -> RebuildSummary; raises DeterministicError when there is no database to load into
    backfill_fn: Callable[[], int] | None = None
    backup_fn: Callable[[], StepResult] | None = None  # the raw archive to restic (backup.py); None = not wired, skipped
    pgdump_fn: Callable[[], StepResult] | None = None
    crawl_delay: float = 0.35
    crawl_start: date | None = None  # PIPELINE_CRAWL_START: where a first crawl with no cursor starts
    fetch_onrc: Callable | None = None  # (archive, limit=) -> OnrcFetchSummary: ONRC's snapshots (#175); None = not wired, the step skips
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc)
    fetch_amepip: Callable | None = None  # (archive) -> AmepipFetchSummary (#183); None = not wired, the step is left out
    fetch_financials: Callable | None = None  # (archive) -> FinancialsFetchSummary (#179); None = not wired, the step is left out
    check_banipartide: Callable | None = None  # (archive) -> CheckResult (#182): only a check; None = not wired, the step is left out

    def crawl(self) -> StepResult:
        progress = CrawlProgress(self.archive.root / "crawl-progress.json", now=self.now)  # prints its own timestamped lines
        try:
            plan = plan_run(self.archive, today=self.now().astimezone(timezone.utc).date(), start=self.crawl_start)
        except CrawlError as e:
            raise DeterministicError(f"crawl: {e}") from e  # no cursor and nothing to start after: a human has to say where to start
        crawler = Crawler(self.archive, self.make_client(self.crawl_delay, progress.note), note=progress.note, now=self.now)
        summary = run_crawl(self.archive, crawler, plan, progress, now=self.now)
        if not summary.ok:
            raise TransientError(f"crawl stopped at {summary.failed or summary.recrawl_failed}: {summary.error or 're-crawl failed'}")
        return StepResult({"days": len(summary.crawled), "notices": summary.notices, "contracts": summary.contracts})

    def datagov(self) -> StepResult:
        bulk = self.fetch_datagov(self.archive)
        mf = self.fetch_mf(self.archive)
        warnings = [f"data.gov.ro resource not classified: {i}" for i in bulk.unclassified + bulk.conflicts] + [f"MF list resource not classified: {t}" for t in mf.unclassified]
        warnings += [f"data.gov.ro dataset missing: {d}" for d in bulk.missing_datasets]
        failed = [str(i) for i in bulk.failed] + list(mf.failed)
        if failed:
            raise TransientError(f"{len(failed)} data.gov.ro/MF download(s) failed: {failed[0]}")
        return StepResult({"archived": len(bulk.archived), "unchanged": len(bulk.unchanged), "mfArchived": len(mf.archived)}, [], warnings)

    def onrc(self, limit: int | None = None) -> StepResult:
        """ONRC's monthly snapshots. Its own step, so a failing ONRC never blocks SEAP's: the three failure classes are the connector's own (onrc/fetch.py). `limit` caps the snapshots downloaded in this run (the refresh passes a small one, the seed none)."""
        if self.fetch_onrc is None:
            raise DeterministicError("ONRC fetch is not configured")
        summary = self.fetch_onrc(self.archive, limit=limit)
        if summary.invalid:
            raise DeterministicError(f"{len(summary.invalid)} ONRC file(s) are not what they should be: {summary.invalid[0]}")  # retrying fetches the same file
        if summary.failed:
            raise TransientError(f"{len(summary.failed)} ONRC download(s) failed: {summary.failed[0]}")
        warnings = [f"ONRC dataset not classified: {t}" for t in summary.unclassified] + list(summary.warnings)
        warnings += [w for w in [_onrc_stale(self.archive, self.now())] if w]
        return StepResult({"archived": len(summary.archived), "unchanged": len(summary.unchanged)}, [], warnings)

    def amepip(self) -> StepResult:
        """AMEPIP's public-enterprise list (#183): its own step, so a failing portal never holds back data.gov.ro, ANAF or the load."""
        summary = self.fetch_amepip(self.archive)
        warnings = [f"AMEPIP resource not classified: {t}" for t in summary.unclassified]
        if summary.failed:
            raise TransientError(f"{len(summary.failed)} AMEPIP fetch failure(s): {summary.failed[0]}")
        return StepResult({"archived": len(summary.archived), "unchanged": len(summary.unchanged)}, [], warnings)

    def financials(self) -> StepResult:
        """MF's annual financial statements (#179): its own step, so a failing portal never holds back data.gov.ro, ANAF or the load. A download that is not a statements file is deterministic (the same file again), a portal or network error is transient."""
        summary = self.fetch_financials(self.archive)
        if summary.invalid:
            raise DeterministicError(f"{len(summary.invalid)} financial-statements file(s) are not what they should be: {summary.invalid[0]}")
        if summary.failed:
            raise TransientError(f"{len(summary.failed)} financial-statements fetch failure(s): {summary.failed[0]}")
        warnings = [f"financial-statements resource not classified: {t}" for t in summary.unclassified]
        return StepResult({"archived": len(summary.archived), "unchanged": len(summary.unchanged)}, [], warnings)

    def banipartide(self) -> StepResult:
        """BaniPartide's firm donors (#182) are loaded once from an archived file: this step only CHECKS for a newer upstream database and warns (the alert), never fetches. A failed check is transient."""
        result = self.check_banipartide(self.archive)
        if result.state == "failed":
            raise TransientError(result.detail)
        warnings = [result.detail] if result.state in ("newer", "nothing held") else []
        return StepResult({"state": result.state}, [], warnings)

    def anaf(self) -> StepResult:
        progress = AnafProgress(self.archive.root / "anaf-progress.json")
        cuis = collect_cuis(self.archive, say=progress.note)
        summary = lookup(self.archive, cuis, self.anaf_client(), progress, recheck_after_days=RECHECK_ANAF_AFTER_DAYS)
        warnings = [f"anaf: {summary.failed_batches} batch(es) skipped after every retry failed, {summary.failed_cuis} CUIs still pending"] if summary.failed_batches else []
        return StepResult({"cuis": summary.cuis, "found": summary.found, "notFound": summary.not_found, "batches": summary.batches}, [], warnings)

    def load(self) -> StepResult:
        summary = self.load_fn()
        warnings = [f"quarantined (not loaded, shown as not yet loaded): {p}" for p in summary.quarantined]
        warnings += [line for line in summary.coverage if "possibly incomplete" in line]
        warnings += [f"set aside (a file that switches kind partway; its tail is not loaded and its cell has no known gap): {p}" for p in summary.set_aside_without_gap]
        return StepResult({"files": summary.files_loaded, "records": summary.records, "quarantined": len(summary.quarantined)}, [], warnings)

    def backfill(self) -> StepResult:
        if self.backfill_fn is None:
            raise DeterministicError("no backfill configured")
        if self.backfill_fn() != 0:
            raise TransientError("backfill stopped before every week was complete; rerun to resume")
        return StepResult({})

    def backup(self) -> StepResult:
        return self.backup_fn() if self.backup_fn else StepResult({"skipped": "not configured"})

    def pgdump(self) -> StepResult:
        return self.pgdump_fn() if self.pgdump_fn else StepResult({"skipped": "not configured"})
