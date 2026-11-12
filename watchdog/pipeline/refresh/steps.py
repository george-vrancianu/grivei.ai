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
from .engine import DeterministicError, StepResult, TransientError

RECHECK_ANAF_AFTER_DAYS = 365


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
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc)

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

    def anaf(self) -> StepResult:
        progress = AnafProgress(self.archive.root / "anaf-progress.json")
        cuis = collect_cuis(self.archive, say=progress.note)
        summary = lookup(self.archive, cuis, self.anaf_client(), progress, recheck_after_days=RECHECK_ANAF_AFTER_DAYS)
        return StepResult({"cuis": summary.cuis, "found": summary.found, "notFound": summary.not_found, "batches": summary.batches})

    def load(self) -> StepResult:
        summary = self.load_fn()
        warnings = [f"quarantined (not loaded, shown as not yet loaded): {p}" for p in summary.quarantined]
        warnings += [line for line in summary.coverage if "possibly incomplete" in line]
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
