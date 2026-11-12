"""Seam 2 for the estimated-value lookup (#65): HTTP stubbed (one `post` callable, a fake clock), answers checked in the raw
archive, resuming, pacing and the log. No network, no database, nothing slept for real."""
import json
import os
import re
from datetime import datetime, timedelta, timezone

import pytest
import requests

from pipeline import cli, estimates
from pipeline.archive import Archive
from pipeline.counting import Estimate
from pipeline.crawl import CrawlError, EliClient
from pipeline.crawl.client import HEADERS

START = datetime(2026, 11, 12, 3, 0, tzinfo=timezone.utc)


class Clock:
    def __init__(self):
        self.moment, self.slept = START, []

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
            raise requests.HTTPError(str(self.status_code), response=self)


def row(code, text, currency="RON"):
    return {"caNoticeId": 1, "noticeNo": code, "estimatedValueExport": text, "currencyCode": currency, "ronContractValue": 1.0}


def answer(*rows) -> bytes:
    return json.dumps({"items": list(rows), "total": len(rows), "searchTooLong": False}, indent=1).encode()  # an odd layout: must not be re-serialised


class FakeEli:
    def __init__(self, answers):
        self.answers, self.calls = answers, []
        self.die_at = None
        self.status = {}

    def post(self, url, json=None, headers=None, timeout=None):
        self.calls.append({"url": url, "body": json, "headers": headers})
        n = len(self.calls)
        if self.die_at == n:
            raise SystemExit(143)
        if n in self.status:
            return Reply(b"{}", self.status[n])
        return Reply(self.answers[json["number"]])


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


def run(archive, eli, clock, codes, **kw):
    lines = []
    client = EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, log=lines.append)
    summary = estimates.lookup(archive, codes, client, lines.append, now=clock.now, **kw)
    return summary, lines


ANSWERS = {
    "CAN1": answer(row("CAN1", "10000000 RON")),
    "CAN2": answer(row("CAN2", "820640680,86 RON")),
    "CAN3": answer(),  # no such notice
    "CAN4": answer(row("CAN4", "0 RON")),
}


# ---- the request ---------------------------------------------------------------------------------------------------------


def test_the_request_is_the_public_notice_list_filtered_by_number_with_the_pub_referer(archive, clock):
    eli = FakeEli(ANSWERS)
    run(archive, eli, clock, ["CAN1"])
    (call,) = eli.calls
    assert call["url"] == "https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/"
    assert call["headers"]["Referer"] == "https://e-licitatie.ro/pub" == HEADERS["Referer"]
    assert call["body"]["number"] == "CAN1" and call["body"]["pageIndex"] == 0 and call["body"]["pageSize"] == 10


def test_requests_keep_the_polite_delay_on_a_fake_clock(archive, clock):
    run(archive, FakeEli(ANSWERS), clock, ["CAN1", "CAN2", "CAN3"])
    assert len(clock.slept) == 2 and all(s == pytest.approx(0.35) for s in clock.slept)


# ---- the archive ---------------------------------------------------------------------------------------------------------


def test_each_answer_is_archived_unchanged_and_dated_with_a_manifest_naming_both_files(archive, clock):
    run(archive, FakeEli(ANSWERS), clock, ["CAN2"])
    directory = archive.root / "seap/estimates/notice-value/CAN2/2026-11-12"
    assert (directory / "response.json").read_bytes() == ANSWERS["CAN2"]  # byte for byte
    sent = json.loads((directory / "request.json").read_text())
    assert sent["body"]["number"] == "CAN2" and sent["endpoint"].endswith("/GetCANoticeList/")
    manifest = json.loads((directory / "manifest.json").read_text())
    assert manifest["unit"] == "CAN2" and manifest["fetchedAt"] == "2026-11-12T03:00:00Z"
    assert {f["name"] for f in manifest["files"]} == {"request.json", "response.json"}
    assert not [p for p in directory.iterdir() if p.suffix in (".part", ".tmp")]
    (unit,) = [u for u in archive.units() if u.stream == "estimates"]  # an ordinary complete unit of the archive
    assert unit.unit == "CAN2"


def test_files_are_written_under_a_temporary_name_and_renamed_the_manifest_last(archive, clock, monkeypatch):
    renamed = []
    real = os.replace
    monkeypatch.setattr("pipeline.archive.os.replace", lambda a, b: (renamed.append((os.path.basename(a), os.path.basename(b))), real(a, b))[1])
    run(archive, FakeEli(ANSWERS), clock, ["CAN1"])
    assert renamed == [("request.json.part", "request.json"), ("response.json.part", "response.json"), ("manifest.json.tmp", "manifest.json")]


def test_a_second_answer_on_the_same_day_goes_beside_the_first_never_over_it(archive, clock):
    estimates.archive_answer(archive, "CAN1", ANSWERS["CAN1"], START)
    estimates.archive_answer(archive, "CAN1", ANSWERS["CAN2"].replace(b"CAN2", b"CAN1"), START + timedelta(hours=1))
    assert sorted(p.name for p in (archive.root / "seap/estimates/notice-value/CAN1").iterdir()) == ["2026-11-12", "2026-11-12.2"]
    assert estimates.read_estimates(archive)["CAN1"] == Estimate(82064068086)  # the later answer wins


# ---- what an answer says -------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("text,currency,bani", [
    ("10000000 RON", "RON", 1_000_000_000), ("820640680,86 RON", "RON", 82_064_068_086), ("1.234.567,89 RON", "RON", 123_456_789),
    ("838435 RON", "RON", 83_843_500), ("0 RON", "RON", None), ("", "RON", None), ("5000 EUR", "EUR", None), ("abc", "RON", None)])
def test_the_estimate_is_the_ron_amount_in_bani_or_no_estimate(text, currency, bani):
    assert estimates.parse_estimate(answer(row("CANX", text, currency)), "CANX") == Estimate(bani)


def test_no_row_for_the_notice_or_an_unreadable_answer_is_no_estimate():
    assert estimates.parse_estimate(answer(row("CANY", "10 RON")), "CANX") == Estimate(None)
    assert estimates.parse_estimate(b"<html>", "CANX") == Estimate(None)


def test_every_answer_is_read_back_and_a_looked_up_notice_without_estimate_is_not_a_missing_one(archive, clock):
    run(archive, FakeEli(ANSWERS), clock, list(ANSWERS))
    read = estimates.read_estimates(archive)
    assert read == {"CAN1": Estimate(1_000_000_000), "CAN2": Estimate(82_064_068_086), "CAN3": Estimate(None), "CAN4": Estimate(None)}
    assert "CAN5" not in read


def test_an_incomplete_directory_is_ignored(archive, clock):
    run(archive, FakeEli(ANSWERS), clock, ["CAN1"])
    (archive.root / "seap/estimates/notice-value/CAN1/2026-11-12/manifest.json").unlink()
    assert estimates.read_estimates(archive) == {}


# ---- resume, failure, log ------------------------------------------------------------------------------------------------


def test_notices_already_archived_are_not_asked_again(archive, clock):
    run(archive, FakeEli(ANSWERS), clock, ["CAN1", "CAN2"])
    eli = FakeEli(ANSWERS)
    summary, lines = run(archive, eli, clock, ["CAN1", "CAN2", "CAN3"])
    assert [c["body"]["number"] for c in eli.calls] == ["CAN3"]
    assert (summary.asked, summary.skipped) == (1, 2)
    assert "notices=1 already_archived=2" in lines[0]


def test_a_killed_run_leaves_the_finished_answers_and_the_rerun_asks_only_for_the_rest(archive, clock):
    eli = FakeEli(ANSWERS)
    eli.die_at = 3
    with pytest.raises(SystemExit):
        run(archive, eli, clock, ["CAN1", "CAN2", "CAN3", "CAN4"])
    assert set(estimates.read_estimates(archive)) == {"CAN1", "CAN2"}
    eli2 = FakeEli(ANSWERS)
    run(archive, eli2, clock, ["CAN1", "CAN2", "CAN3", "CAN4"])
    assert [c["body"]["number"] for c in eli2.calls] == ["CAN3", "CAN4"]


def test_a_request_that_cannot_be_completed_fails_and_archives_nothing_for_that_notice(archive, clock):
    eli = FakeEli(ANSWERS)
    eli.status = {2: 404}
    with pytest.raises(CrawlError):
        run(archive, eli, clock, ["CAN1", "CAN2"])
    assert set(estimates.read_estimates(archive)) == {"CAN1"}


def test_one_timestamped_line_per_notice_flushed_with_start_and_done_lines(archive, clock):
    _, lines = run(archive, FakeEli(ANSWERS), clock, ["CAN1", "CAN2", "CAN3"])
    assert len(lines) == 5
    assert all(re.match(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4} estimates ", line) for line in lines)  # every line is timestamped
    assert lines[0].split(" ", 1)[1].startswith("estimates start notices=3 already_archived=0")
    assert "estimates notice 1/3 CAN1 estimate=10000000 RON archived=seap/estimates/notice-value/CAN1/2026-11-12" in lines[1]
    assert "estimates notice 2/3 CAN2 estimate=820640680.86 RON" in lines[2]
    assert "estimates notice 3/3 CAN3 estimate=none" in lines[3]
    assert "estimates done notices=3 with_estimate=2 without_estimate=1 already_archived=0" in lines[4]


def test_max_notices_is_a_trial_run(archive, clock):
    eli = FakeEli(ANSWERS)
    run(archive, eli, clock, ["CAN1", "CAN2", "CAN3"], max_notices=1)
    assert len(eli.calls) == 1


# ---- the command ---------------------------------------------------------------------------------------------------------


def test_the_estimates_command_archives_through_the_one_client_seam_and_fails_with_a_resumable_line(tmp_path, clock, monkeypatch, capsys):
    eli = FakeEli(ANSWERS)
    monkeypatch.setattr(cli, "estimate_candidates", lambda db: ["CAN1", "CAN2"])
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, delay=delay, log=log))
    assert cli.main(["--archive", str(tmp_path / "a"), "estimates", "--db", "postgresql://x/y", "--delay", "0"]) == 0
    out = capsys.readouterr().out
    assert "estimates candidates: 2 notice(s)" in out and "estimates notice 2/2 CAN2" in out and "estimates done notices=2" in out
    assert set(estimates.read_estimates(Archive(tmp_path / "a"))) == {"CAN1", "CAN2"}
    eli.status = {len(eli.calls) + 1: 404}
    monkeypatch.setattr(cli, "estimate_candidates", lambda db: ["CAN1", "CAN2", "CAN3"])
    assert cli.main(["--archive", str(tmp_path / "a"), "estimates", "--db", "postgresql://x/y", "--delay", "0"]) == 1
    assert "estimates FAILED" in capsys.readouterr().out
    assert cli.main(["--archive", str(tmp_path / "a"), "estimates"]) == 2  # no database named
