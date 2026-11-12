"""Seam 2 for the e-licitatie crawl (#77): HTTP stubbed (one `post` callable, a fake clock), files checked in the raw archive,
the cursor, the trailing re-crawl, resuming and the status. No network, no database, nothing slept for real."""
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests

from pipeline import cli
from pipeline.archive import Archive
from pipeline.crawl import CrawlError, CrawlProgress, Crawler, EliClient, cursor, plan_run, run_crawl
from pipeline.crawl import unitdir
from pipeline.crawl.client import HEADERS
from pipeline.crawl.core import CONTRACTS, NOTICE_CAP, NOTICE_LIST
from pipeline.crawl.run import TRAILING_DAYS, default_start

START = datetime(2026, 11, 12, 3, 0, tzinfo=timezone.utc)


class Clock:
    """A fake clock: `sleep` advances it, nothing really waits."""

    def __init__(self, start=START):
        self.moment, self.slept = start, []

    def now(self):
        return self.moment

    def monotonic(self):
        return self.moment.timestamp()

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.moment += timedelta(seconds=seconds)


class Reply:
    def __init__(self, body: bytes, status=200):
        self.content, self.status_code = body, status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code}", response=self)


def raw(payload) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=1).encode("utf-8")  # an odd layout: archiving must not re-serialise


def notice(i, day, procedure=1):
    return {"caNoticeId": i, "noticeNo": f"CAN{i}", "procedureId": procedure, "sysNoticeTypeId": 3, "sysNoticeVersionId": 2,
            "noticeStateDate": f"{day}T10:00:00+03:00", "contractTitle": "t", "contractingAuthorityNameAndFN": "1000001 - AUTORITATE"}


def contract(i, notice_id, value=10.5):
    return {"caNoticeContractId": i, "noticeNo": f"CAN{notice_id}", "contractNo": f"C{i}", "contractDate": "2026-10-01T00:00:00+03:00",
            "defaultCurrencyContractValue": value, "winners": [{"name": "FIRMA", "fiscalNumber": "2000001"}]}


class FakeEli:
    """api-pub as far as the crawl sees it. `notices[day]` is that day's list rows, `contracts[caNoticeId]` the notice's contracts.
    `fail` maps a request number (1-based) to an exception or status to answer with; `die_at` raises SystemExit (a kill) at that request."""

    def __init__(self, notices=None, contracts=None, cap=NOTICE_CAP):
        self.notices, self.contracts, self.cap = notices or {}, contracts or {}, cap
        self.calls: list[dict] = []
        self.fail: dict[int, object] = {}
        self.die_at: int | None = None
        self.list_page = None  # override: (body) -> payload

    def post(self, url, json=None, headers=None, timeout=None):
        self.calls.append({"url": url, "body": json, "headers": headers, "timeout": timeout})
        n = len(self.calls)
        if self.die_at == n:
            raise SystemExit(143)
        if n in self.fail:
            f = self.fail[n]
            if isinstance(f, BaseException):
                raise f
            return Reply(b"{}" if f != "html" else b"<html>oops</html>", 200 if f == "html" else f)
        if url.endswith(NOTICE_LIST):
            return Reply(raw(self.list_page(json) if self.list_page else self._list(json)))
        assert url.endswith(CONTRACTS), url
        return Reply(raw(self._contracts(json)))

    def _list(self, body):
        a, b = body["startPublicationDate"][:10], body["endPublicationDate"][:10]
        rows = [r for d, rs in sorted(self.notices.items()) if a <= d <= b for r in rs]
        if len(rows) >= self.cap:
            return {"items": rows[: body["pageSize"]], "total": self.cap, "searchTooLong": True}
        i = body["pageIndex"] * body["pageSize"]
        return {"items": rows[i : i + body["pageSize"]], "total": len(rows), "searchTooLong": False}

    def _contracts(self, body):
        rows = self.contracts.get(body["caNoticeId"], [])
        return {"items": rows[body["skip"] : body["skip"] + body["take"]], "total": len(rows)}

    def paths(self):
        return [c["url"].split("e-licitatie.ro")[1] for c in self.calls]


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


def make(archive, eli, clock, **client_kw):
    lines = []
    client = EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, log=lines.append, **client_kw)
    return Crawler(archive, client, now=clock.now, note=lines.append), lines


def crawl_days(archive, crawler, clock, first, last, **kw):
    lines = []
    progress = CrawlProgress(archive.root / "crawl-progress.json", out=lines.append, now=clock.now)
    crawler._note = progress.note  # as the CLI wires it: page and batch lines go to the same log
    crawler.client._log = progress.note
    plan = plan_run(archive, today=clock.now().date(), first=first, last=last, **kw)
    summary = run_crawl(archive, crawler, plan, progress, now=clock.now)
    return summary, lines, progress


D = date.fromisoformat


# ---- what the crawl asks the server ---------------------------------------------------------------------------------------


def test_every_request_carries_the_pub_referer_and_asks_for_pages_of_1000(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(1, 1)]})
    crawler, _ = make(archive, eli, clock)
    crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert eli.paths() == [NOTICE_LIST, CONTRACTS]
    assert all(c["headers"]["Referer"] == "https://e-licitatie.ro/pub" == HEADERS["Referer"] for c in eli.calls)
    assert eli.calls[0]["body"]["pageSize"] == 1000 and eli.calls[0]["body"]["pageIndex"] == 0
    assert eli.calls[0]["body"]["startPublicationDate"].startswith("2026-10-01") and eli.calls[0]["body"]["contractingAuthorityId"] is None
    assert eli.calls[1]["body"]["caNoticeId"] == 1 and eli.calls[1]["body"]["take"] == 1000 and eli.calls[1]["body"]["skip"] == 0


def test_direct_purchases_are_not_crawled(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(1, 1)]})
    crawler, _ = make(archive, eli, clock)
    crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert not any("DirectAcquisition" in p for p in eli.paths())


def test_the_polite_delay_keeps_requests_apart_on_the_clock(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(i, "2026-10-01") for i in (1, 2, 3)]}, {i: [contract(i, i)] for i in (1, 2, 3)})
    stamps = []
    original = eli.post
    eli.post = lambda *a, **k: (stamps.append(clock.monotonic()), original(*a, **k))[1]
    crawler, _ = make(archive, eli, clock, delay=0.35)
    crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert len(stamps) == 4
    assert all(b - a >= 0.35 - 1e-4 for a, b in zip(stamps, stamps[1:]))
    assert sum(clock.slept) == pytest.approx(0.35 * 3)  # nothing was waited for before the first request


# ---- the list: cap splitting, paging, repeated and empty pages --------------------------------------------------------------


def test_a_window_over_the_cap_is_split_in_halves_until_every_row_is_in(archive, clock):
    days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]
    eli = FakeEli({d: [notice(100 * k + j, d) for j in range(1, 4)] for k, d in enumerate(days, 1)}, cap=8)  # 12 rows: over a cap of 8
    crawler, lines = make(archive, eli, clock)
    crawler.keep = lambda row: False  # only the list is under test
    result = crawler.crawl_unit("w", D("2026-10-01"), D("2026-10-04"))
    assert result.notices == 12
    windows = [(c["body"]["startPublicationDate"][:10], c["body"]["endPublicationDate"][:10]) for c in eli.calls]
    assert windows == [("2026-10-01", "2026-10-04"), ("2026-10-01", "2026-10-02"), ("2026-10-03", "2026-10-04")]
    assert any("over the cap, splitting at 2026-10-02" in line for line in lines)


def test_a_day_over_the_cap_fails_instead_of_truncating_and_leaves_no_manifest(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(i, "2026-10-01") for i in range(1, 6)]}, cap=3)
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="over the 3 result cap|over the 3000 result cap|result cap"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert cursor(archive) is None


def test_a_list_of_several_pages_is_paged_with_pageindex(archive, clock):
    rows = [notice(i, "2026-10-01") for i in range(1, 2301)]
    eli = FakeEli({"2026-10-01": rows}, {})
    crawler, _ = make(archive, eli, clock)
    crawler.keep = lambda row: False  # only the list is under test
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert result.notices == 2300 and result.list_pages == 3
    assert [c["body"]["pageIndex"] for c in eli.calls] == [0, 1, 2]


def test_pages_that_repeat_rows_fail_the_day(archive, clock):
    rows = [notice(i, "2026-10-01") for i in range(1, 4)]
    eli = FakeEli({"2026-10-01": rows})
    eli.list_page = lambda body: {"items": rows[:2] if body["pageIndex"] == 0 else rows[:2], "total": 4, "searchTooLong": False}
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="unique|empty page|repeat"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert cursor(archive) is None


def test_an_empty_page_before_total_fails_the_day(archive, clock):
    eli = FakeEli()
    eli.list_page = lambda body: {"items": [notice(1, "2026-10-01")] if body["pageIndex"] == 0 else [], "total": 5, "searchTooLong": False}
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="empty page"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))


# ---- the contracts of a notice ---------------------------------------------------------------------------------------------


def test_contracts_are_paged_with_skip_until_total(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(i, 1) for i in range(1, 2501)]})
    crawler, _ = make(archive, eli, clock)
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert result.contracts == 2500 and result.contract_pages == 3
    assert [c["body"]["skip"] for c in eli.calls[1:]] == [0, 1000, 2000]


def test_contract_pages_that_repeat_or_run_empty_fail_the_day(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(i, 1) for i in range(1, 5)]})
    eli._contracts = lambda body: {"items": [contract(1, 1), contract(2, 1)], "total": 4}  # the same two again and again
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="unique of 4"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    eli2 = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]})
    eli2._contracts = lambda body: {"items": [contract(1, 1)] if body["skip"] == 0 else [], "total": 3}
    crawler2, _ = make(archive, eli2, clock)
    with pytest.raises(CrawlError, match="empty page"):
        crawler2.crawl_unit("2026-10-02", D("2026-10-01"), D("2026-10-01"))


def test_the_keep_hook_chooses_which_notices_get_their_contracts(archive, clock):
    rows = [notice(1, "2026-10-01", procedure=None), notice(2, "2026-10-01", procedure=7)]
    eli = FakeEli({"2026-10-01": rows}, {1: [contract(1, 1)], 2: [contract(2, 2)]})
    crawler, _ = make(archive, eli, clock)

    def no_procedure(row):
        return row["procedureId"] is None

    crawler.keep = no_procedure
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert (result.notices, result.kept, result.contracts) == (2, 1, 1)
    assert [c["body"]["caNoticeId"] for c in eli.calls[1:]] == [1]
    manifest = json.loads((result.path / "manifest.json").read_text())
    assert manifest["crawl"]["keep"] == "no_procedure" and manifest["crawl"]["kept"] == 1


# ---- retries ---------------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("failure", [503, 429, 403, requests.ConnectionError("reset"), requests.Timeout("slow"), "html"])
def test_a_transient_error_is_retried_with_a_growing_pause(archive, clock, failure):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(1, 1)]})
    eli.fail = {1: failure, 2: failure}
    crawler, lines = make(archive, eli, clock)
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert result.notices == 1 and len(eli.calls) == 4  # two failures, then the list, then the contracts
    assert [s for s in clock.slept if s >= 5] == [5, 10]  # back-off 5 s, then 10 s
    assert sum("retry" in line for line in lines) == 2


def test_a_request_that_keeps_failing_fails_the_day_after_the_retries(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]})
    eli.fail = {n: 500 for n in range(1, 10)}
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="500"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert len(eli.calls) == 4  # 1 + 3 retries
    assert cursor(archive) is None


def test_an_error_that_would_fail_again_is_not_retried(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]})
    eli.fail = {1: 404}
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(CrawlError, match="404"):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert len(eli.calls) == 1


# ---- the archive: unchanged files, manifest last, .part never counts -------------------------------------------------------


def test_every_response_is_archived_unchanged_and_the_manifest_is_written_last(archive, clock, monkeypatch):
    rows = [notice(1, "2026-10-01"), notice(2, "2026-10-01")]
    eli = FakeEli({"2026-10-01": rows}, {1: [contract(1, 1)], 2: [contract(2, 2), contract(3, 2)]})
    renamed = []
    real = os.replace
    monkeypatch.setattr(unitdir.os, "replace", lambda a, b: (renamed.append(Path(b).name), real(a, b))[1])
    crawler, _ = make(archive, eli, clock)
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert result.path == archive.root / "seap/crawl/award-notices/2026-10-01/2026-11-12"
    assert renamed[-1] == "manifest.json" and renamed.count("manifest.json") == 1  # last, and every file before it
    assert renamed[:-1] == ["notices-2026-10-01_2026-10-01-p0000.json", "contracts-1-s00000.json", "contracts-2-s00000.json"]
    assert (result.path / "notices-2026-10-01_2026-10-01-p0000.json").read_bytes() == raw({"items": rows, "total": 2, "searchTooLong": False})
    assert (result.path / "contracts-2-s00000.json").read_bytes() == raw({"items": [contract(2, 2), contract(3, 2)], "total": 2})
    manifest = json.loads((result.path / "manifest.json").read_text())
    assert manifest["via"] == "crawl" and manifest["unit"] == "2026-10-01" and manifest["fetchedAt"] == "2026-11-12T03:00:00Z"
    assert [f["name"] for f in manifest["files"]] == sorted(f["name"] for f in manifest["files"]) and len(manifest["files"]) == 3
    assert not list(result.path.glob("*.part"))
    assert [u.unit for u in archive.units()] == ["2026-10-01"]  # the archive reads a crawl day like any unit


def test_a_day_is_complete_only_with_a_manifest_whose_files_are_all_there(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(1, 1)]})
    crawler, _ = make(archive, eli, clock)
    path = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01")).path
    assert cursor(archive) == D("2026-10-01")
    (path / "contracts-1-s00000.json").write_bytes(b"{}")  # not the size the manifest recorded
    assert cursor(archive) is None
    (path / "contracts-1-s00000.json").unlink()
    assert cursor(archive) is None
    (path / "manifest.json").write_text("{ not json")
    assert cursor(archive) is None


def test_a_killed_day_leaves_no_manifest_and_only_whole_files(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(i, "2026-10-01") for i in (1, 2, 3)]}, {i: [contract(i, i)] for i in (1, 2, 3)})
    eli.die_at = 4  # the list, two contracts, then the kill during the third
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(SystemExit):
        crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    directory = archive.root / "seap/crawl/award-notices/2026-10-01/2026-11-12"
    assert sorted(p.name for p in directory.iterdir()) == ["contracts-1-s00000.json", "contracts-2-s00000.json", "notices-2026-10-01_2026-10-01-p0000.json"]
    assert cursor(archive) is None and archive.units() == [] and archive.incomplete() == [directory]


# ---- the run: cursor, trailing re-crawl, resuming --------------------------------------------------------------------------


def eli_for(days, per_day=1):
    notices = {d: [notice(int(d.replace("-", "")) * 10 + k, d) for k in range(per_day)] for d in days}
    contracts = {n["caNoticeId"]: [contract(n["caNoticeId"], n["caNoticeId"])] for rows in notices.values() for n in rows}
    return FakeEli(notices, contracts)


def test_the_cursor_advances_only_on_complete_days(archive, clock):
    days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]
    eli = eli_for(days)
    # day 3 = requests 5 (list) and 6 (contracts): fail the list for good
    eli.fail = {n: 500 for n in range(5, 9)}
    crawler, _ = make(archive, eli, clock)
    summary, lines, _ = crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-04"))
    assert not summary.ok and summary.failed == D("2026-10-03")
    assert [d.isoformat() for d in summary.crawled] == ["2026-10-01", "2026-10-02"]  # the run stopped at the hole: day 4 was not tried
    assert cursor(archive) == D("2026-10-02")
    assert "crawl FAILED day 2026-10-03" in lines[-1] and "cursor stays at 2026-10-02" in lines[-1]
    status = json.loads((archive.root / "crawl-progress.json").read_text())
    assert status["state"] == "failed" and status["cursor"] == "2026-10-02"


def test_a_rerun_skips_complete_days_and_makes_no_request_for_them(archive, clock):
    eli = eli_for(["2026-10-01", "2026-10-02"])
    crawler, _ = make(archive, eli, clock)
    crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-02"))
    before = len(eli.calls)
    summary, lines, _ = crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-02"))
    assert len(eli.calls) == before and [d.isoformat() for d in summary.skipped] == ["2026-10-01", "2026-10-02"]
    assert sum("skipped (complete)" in line for line in lines) == 2
    summary, _, _ = crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-01"), force=True)  # --force fetches it again
    assert len(eli.calls) == before + 2 and len(list((archive.root / "seap/crawl/award-notices/2026-10-01").iterdir())) == 2


def test_the_nightly_run_catches_up_from_the_cursor_and_recrawls_the_three_trailing_days(archive, clock):
    days = [f"2026-10-{d:02d}" for d in range(1, 12)]
    eli = eli_for(days)
    clock.moment = datetime(2026, 10, 6, 3, 0, tzinfo=timezone.utc)
    crawler, _ = make(archive, eli, clock)
    crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-05"))  # a first crawl up to the 5th
    assert cursor(archive) == D("2026-10-05")
    clock.moment = datetime(2026, 10, 8, 3, 0, tzinfo=timezone.utc)  # three nights later
    eli.calls.clear()
    plan = plan_run(archive, today=clock.now().date())
    assert TRAILING_DAYS == 3
    assert [d.isoformat() for d in plan.days] == ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]  # to yesterday
    assert sorted(d.isoformat() for d in plan.recrawl) == ["2026-10-03", "2026-10-04", "2026-10-05"]
    summary, _, _ = run_crawl(archive, crawler, plan, CrawlProgress(None, out=lambda line: None, now=clock.now), now=clock.now), None, None
    assert [d.isoformat() for d in summary.crawled] == ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]
    assert cursor(archive) == D("2026-10-07")
    for day in ("2026-10-03", "2026-10-04", "2026-10-05"):  # the re-crawled days are new dated fetches beside the old ones
        assert len(list((archive.root / "seap/crawl/award-notices" / day).iterdir())) == 2
    assert len(list((archive.root / "seap/crawl/award-notices/2026-10-02").iterdir())) == 1  # the 1st and 2nd were left alone
    # a restarted run the same day does not re-crawl them a second time
    again = run_crawl(archive, crawler, plan_run(archive, today=clock.now().date()), CrawlProgress(None, out=lambda line: None, now=clock.now), now=clock.now)
    assert [d.isoformat() for d in again.crawled] == []


def test_an_interrupted_day_resumes_and_fetches_only_what_is_missing(archive, clock):
    eli = FakeEli({"2026-10-01": [notice(i, "2026-10-01") for i in (1, 2, 3)]}, {i: [contract(i, i)] for i in (1, 2, 3)})
    eli.die_at = 4
    crawler, _ = make(archive, eli, clock)
    with pytest.raises(SystemExit):
        crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-01"))
    assert cursor(archive) is None
    assert json.loads((archive.root / "crawl-progress.json").read_text())["state"] == "failed"  # a kill is recorded
    eli.die_at = None
    eli.calls.clear()
    summary, lines, _ = crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-01"))
    assert summary.ok and cursor(archive) == D("2026-10-01")
    assert eli.paths() == [CONTRACTS] and eli.calls[0]["body"]["caNoticeId"] == 3  # only the notice that was cut off
    assert len(list((archive.root / "seap/crawl/award-notices/2026-10-01").iterdir())) == 1  # the same directory, completed
    assert any("(resumed)" in line for line in lines)
    assert len(archive.units()[0].files) == 4


def test_a_stale_leftover_is_not_resumed_into_a_re_crawl(archive, clock):
    eli = eli_for(["2026-10-01"])
    crawler, _ = make(archive, eli, clock)
    crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-01"))
    stale = archive.root / "seap/crawl/award-notices/2026-10-01/2026-11-01"
    stale.mkdir()
    (stale / "notices-2026-10-01_2026-10-01-p0000.json").write_bytes(raw({"items": [], "total": 0}))
    clock.moment += timedelta(days=1)
    result = crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert result.path.name == "2026-11-13" and not result.resumed


def test_the_first_run_starts_the_day_after_the_last_bulk_quarter_or_where_it_is_told_to(archive, clock):
    with pytest.raises(CrawlError, match="--start"):
        plan_run(archive, today=D("2026-11-12"))
    for quarter in ("2025Q1", "2025Q2"):
        archive.write_unit(source="seap", stream="bulk", kind="contracte", unit=quarter, fetched_at=START, files={"x.csv": b"a"}, via="v")
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2026Q1", fetched_at=START, files={"x.csv": b"a"}, via="v")  # another kind: not the reference
    assert default_start(archive) == D("2025-07-01")
    plan = plan_run(archive, today=D("2026-11-12"))
    assert plan.days[0] == D("2025-07-01") and plan.days[-1] == D("2026-11-11") and not plan.recrawl
    assert plan_run(archive, today=D("2026-11-12"), start=D("2026-11-01")).days[0] == D("2026-11-01")
    with pytest.raises(CrawlError, match="future"):
        plan_run(archive, today=D("2026-11-12"), first=D("2026-11-01"), last=D("2026-11-13"))


# ---- progress and status ---------------------------------------------------------------------------------------------------


def test_the_run_logs_timestamped_lines_per_page_day_and_summary(archive, clock):
    eli = eli_for(["2026-10-01", "2026-10-02"], per_day=2)
    crawler, _ = make(archive, eli, clock)
    summary, lines, progress = crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-02"))
    stamp = r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4} "
    import re

    assert all(re.match(stamp, line) for line in lines)
    assert re.search(stamp + r"crawl start from=2026-10-01 to=2026-10-02 days=2 \(cursor none\) archive=.* pid=\d+$", lines[0])
    assert any("crawl day 2026-10-01 notices page 1 window=2026-10-01..2026-10-01 rows=2/2" in line for line in lines)
    day_line = next(line for line in lines if "crawl day 2026-10-01 notices=2 pages=1 contracts=2 archived=" in line)
    assert "/seap/crawl/award-notices/2026-10-01/2026-11-12" in day_line
    assert re.search(r"crawl done days=2 crawled=2 skipped=0 notices=4 contracts=4 cursor=2026-10-02 in \d+:\d\d:\d\d$", lines[-1])


def test_the_status_file_follows_the_run_and_is_replaced_atomically(archive, clock, monkeypatch):
    eli = eli_for(["2026-10-01"])
    crawler, _ = make(archive, eli, clock)
    seen = []
    real = os.replace
    monkeypatch.setattr("pipeline.progress.os.replace", lambda a, b: (seen.append((Path(a).name, Path(b).name)), real(a, b))[1])
    crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-01"))
    status = json.loads((archive.root / "crawl-progress.json").read_text())
    assert status["state"] == "finished" and status["cursor"] == "2026-10-01" and status["crawled"] == 1 and status["contracts"] == 1
    seen = [(src, dst) for src, dst in seen if dst == "crawl-progress.json"]
    assert len(seen) > 3 and all(src.startswith(".crawl-progress.json.") for src, dst in seen)  # always a temp file, then the rename
    assert sorted(p.name for p in archive.root.iterdir()) == ["crawl-progress.json", "seap"]


def test_pipeline_status_shows_the_crawl_cursor_and_the_last_run(archive, clock, capsys):
    assert cli.main(["--archive", str(archive.root), "status"]) == 1  # nothing recorded at all
    capsys.readouterr()
    eli = eli_for(["2026-10-01", "2026-10-02"])
    crawler, _ = make(archive, eli, clock)
    crawl_days(archive, crawler, clock, D("2026-10-01"), D("2026-10-02"))
    assert cli.main(["--archive", str(archive.root), "status"]) == 0
    out = capsys.readouterr().out
    assert "no rebuild status" in out
    assert "crawl cursor: 2026-10-02" in out and "2 complete day(s)" in out
    assert "crawled data through: 2026-10-02" in out and "CONTRACT, AWARD_NOTICE" in out
    assert "crawl run: " in out and "days 2/2 (2 crawled, 0 skipped)" in out


def test_pipeline_status_says_a_killed_crawl_was_interrupted(archive, clock, capsys):
    progress = CrawlProgress(archive.root / "crawl-progress.json", out=lambda line: None, now=clock.now)
    progress.start(D("2026-10-01"), D("2026-10-09"), 9, None, None, archive.root)
    progress.state["pid"] = 2**22 + 12345  # a process that is gone
    progress._write()
    assert cli.main(["--archive", str(archive.root), "status"]) == 1
    assert "crawl run: interrupted" in capsys.readouterr().out


def test_the_crawl_command_runs_a_range_and_logs_to_stdout(archive, clock, capsys, monkeypatch):
    eli = eli_for(["2026-10-01", "2026-10-02"])
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, delay=delay, log=log))
    code = cli.main(["--archive", str(archive.root), "crawl", "--from", "2026-10-01", "--to", "2026-10-02", "--delay", "0"])
    out = capsys.readouterr().out
    assert code == 0 and "crawl done days=2 crawled=2" in out and cursor(archive) == D("2026-10-02")
    assert cli.main(["--archive", str(archive.root), "crawl", "--from", "2026-10-01", "--to", "2026-10-02"]) == 0  # all complete: nothing fetched again
    assert "skipped (complete)" in capsys.readouterr().out and len(eli.calls) == 4


def test_the_crawl_command_exits_nonzero_when_a_day_fails_and_2_without_a_start(archive, clock, capsys, monkeypatch):
    eli = eli_for(["2026-10-01"])
    eli.fail = {n: 500 for n in range(1, 9)}
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, delay=delay, log=log))
    assert cli.main(["--archive", str(archive.root), "crawl", "--from", "2026-10-01", "--to", "2026-10-01"]) == 1
    assert "crawl FAILED day 2026-10-01" in capsys.readouterr().out
    assert cli.main(["--archive", str(archive.root), "crawl"]) == 2
    assert "--start" in capsys.readouterr().err
