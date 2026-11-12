"""Seam 2 (ticket #66): the ANAF Reference source connector against a stubbed HTTP endpoint. No network, no waiting: the
client's clock and sleeper are fakes. Covers batching, pacing, retries, archiving (temp name then rename, the request kept),
resume after a kill, and the progress lines and status file an unattended run is watched by."""
import json
import os
import re
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests

from pipeline import archive as archive_module
from pipeline import cli
from pipeline.anaf import (
    ENDPOINT, AnafClient, AnafError, AnafProgress, archive_batch, collect_cuis, describe_anaf, lookup, pending, read_answers, status_of,
)
from pipeline.archive import Archive
from pipeline.progress import read_status

FIXTURE = Path(__file__).parent / "fixtures" / "archive-identity"
TS = r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4}"
NOW = datetime(2026, 11, 12, 10, 0, 0, tzinfo=timezone.utc)


def entry(cui, name="FIRMA DEMO SRL", state="INREGISTRAT din data 01.01.2000"):
    return {"date_generale": {"cui": cui, "denumire": name, "stare_inregistrare": state, "adresa": "JUD. TEST", "codPostal": ""},
            "stare_inactiv": {"statusInactivi": False}, "adresa_sediu_social": {"sdenumire_Localitate": "Mun. Test"}, "adresa_domiciliu_fiscal": {}}


class Fake:
    """A stubbed ANAF and a fake clock: `post` answers from `script` (a callable per request) and costs `latency` seconds;
    `sleep` advances the clock. Nothing ever waits."""

    def __init__(self, *, latency=0.3, unknown=(), script=None):
        self.t = 1000.0
        self.requests = []  # (clock at start, parsed body)
        self.sleeps = []
        self.latency, self.unknown, self.script = latency, set(unknown), script
        self.on_request = None

    def clock(self):
        return self.t

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.t += seconds

    def post(self, url, body, timeout):
        if self.on_request:
            self.on_request()
        parsed = json.loads(body)
        self.requests.append((self.t, parsed))
        self.t += self.latency
        if self.script:
            result = self.script(len(self.requests), parsed)
            if result is not None:
                return result
        cuis = [e["cui"] for e in parsed]
        found = [entry(c) for c in cuis if c not in self.unknown]
        return 200, json.dumps({"found": found, "notFound": [c for c in cuis if c in self.unknown]}).encode()

    def client(self, **kw):
        return AnafClient(self.post, clock=self.clock, sleep=self.sleep, **kw)


@pytest.fixture
def fake():
    return Fake()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


def run(archive, cuis, fake, progress=None, **kw):
    return lookup(archive, cuis, fake.client(), progress, now=lambda: NOW, **kw)


# ---- batching ---------------------------------------------------------------------------------------------------------


def test_cuis_go_in_batches_of_at_most_100(archive, fake):
    summary = run(archive, range(1000, 1250), fake)
    assert [len(body) for _, body in fake.requests] == [100, 100, 50]
    assert summary.batches == 3 and summary.cuis == 250 and summary.found == 250
    sent = [e["cui"] for _, body in fake.requests for e in body]
    assert sent == list(range(1000, 1250))  # each CUI once, in order
    assert all(set(e) == {"cui", "data"} and e["data"] == "2026-11-12" and isinstance(e["cui"], int) for _, body in fake.requests for e in body)


def test_the_client_refuses_more_than_100_cuis_in_one_request(fake):
    with pytest.raises(ValueError):
        fake.client().query(list(range(101)), date(2026, 11, 12))
    with pytest.raises(ValueError):
        fake.client().query([], date(2026, 11, 12))


def test_duplicates_are_asked_once(archive, fake):
    run(archive, [5, 5, 7, 7, 5], fake)
    assert [e["cui"] for _, body in fake.requests for e in body] == [5, 7]


# ---- pacing ------------------------------------------------------------------------------------------------------------


def test_at_most_one_request_per_second(archive, fake):
    run(archive, range(1000, 1500), fake)  # five requests
    starts = [t for t, _ in fake.requests]
    assert len(starts) == 5
    assert all(b - a >= 1.0 - 1e-9 for a, b in zip(starts, starts[1:]))
    assert sum(fake.sleeps) == pytest.approx(4 * 0.7)  # each request takes 0.3 s: the client waits the other 0.7 s


def test_a_slow_response_is_not_waited_for_twice(archive):
    slow = Fake(latency=2.5)
    run(archive, range(1000, 1300), slow)
    assert slow.sleeps == []  # 2.5 s since the last start is already more than a second


def test_retries_are_paced_too(archive):
    flaky = Fake(script=lambda n, body: (503, b"") if n < 3 else None)
    run(archive, [1, 2], flaky)
    starts = [t for t, _ in flaky.requests]
    assert len(starts) == 3 and all(b - a >= 1.0 for a, b in zip(starts, starts[1:]))


# ---- retries -----------------------------------------------------------------------------------------------------------


def test_transient_errors_are_retried_with_a_growing_backoff(archive):
    answers = iter([(500, b"oops"), (502, b""), (429, b"slow down"), (200, b"<html>maintenance</html>"), (200, b'{"cod": 429, "message": "Too many requests"}'),
                    (200, b'{"found": [], "notFound": [7]}')])
    flaky = Fake(script=lambda n, body: next(answers))
    summary = run(archive, [7], flaky, )
    assert len(flaky.requests) == 6 and summary.not_found == 1
    backoffs = [s for s in flaky.sleeps if s >= 2]
    assert backoffs == sorted(backoffs) and backoffs[0] == 2.0 and backoffs[-1] == 32.0  # 2, 4, 8, 16, 32
    assert len(Archive(archive.root).units()) == 1  # only the good answer is archived


def test_a_timeout_and_a_dropped_connection_are_retried(archive):
    calls = []

    def post(url, body, timeout):
        calls.append(1)
        if len(calls) == 1:
            raise requests.Timeout("slow")
        if len(calls) == 2:
            raise requests.ConnectionError("reset")
        return 200, b'{"found": [], "notFound": [1]}'

    client = AnafClient(post, clock=lambda: 0.0, sleep=lambda s: None)
    assert json.loads(client.query([1], date(2026, 11, 12))) == {"found": [], "notFound": [1]}
    assert len(calls) == 3


def test_a_lookup_gives_up_after_the_retries_and_archives_nothing_for_the_failed_batch(archive):
    dead = Fake(script=lambda n, body: (503, b""))
    with pytest.raises(AnafError, match="giving up after 7 attempts: HTTP 503"):
        run(archive, [1], dead)
    assert len(dead.requests) == 7 and archive.units() == []


def test_a_refused_request_is_not_retried(archive):
    bad = Fake(script=lambda n, body: (400, b"bad request"))
    with pytest.raises(AnafError, match="refused"):
        run(archive, [1], bad)
    assert len(bad.requests) == 1


# ---- archiving ---------------------------------------------------------------------------------------------------------


def test_every_response_is_archived_unchanged_with_its_request_and_the_date(archive, fake):
    body = b'{"found":[{"date_generale":{"cui":5,"denumire":"\xc5\x9eANTIER SRL"}}],"notFound":[6]}'  # not re-serialised: odd spacing, raw UTF-8
    fake_one = Fake(script=lambda n, b: (200, body))
    run(archive, [5, 6], fake_one)
    [unit] = archive.units()
    assert (unit.source, unit.stream, unit.kind, unit.url) == ("anaf", "vat", "v9", ENDPOINT)
    assert unit.fetched_at == NOW and unit.path.parts[-1] == "2026-11-12"
    assert unit.file_path("response.json").read_bytes() == body  # byte for byte
    request = json.loads(unit.file_path("request.json").read_text())
    assert request == {"endpoint": ENDPOINT, "date": "2026-11-12", "cuis": [5, 6]}  # a rebuild knows what was asked, found or not


def test_files_are_written_under_a_temporary_name_and_renamed_and_the_manifest_comes_last(archive, fake, monkeypatch):
    seen = []
    real = os.replace

    def spy(src, dst):
        seen.append((Path(src).name, Path(dst).name))
        return real(src, dst)

    monkeypatch.setattr(archive_module.os, "replace", spy)
    run(archive, [1, 2, 3], fake)
    assert seen == [("request.json.part", "request.json"), ("response.json.part", "response.json"), ("manifest.json.tmp", "manifest.json")]
    [unit] = archive.units()
    assert sorted(p.name for p in unit.path.iterdir()) == ["manifest.json", "request.json", "response.json"]  # no temp file left


def test_a_batch_that_died_before_its_manifest_is_invisible_and_asked_again(archive, fake):
    partial = archive.root / "anaf/vat/v9/0000000001-2/2026-11-12"
    partial.mkdir(parents=True)
    (partial / "response.json").write_bytes(b'{"found":[],"notFound":[1,')  # torn, and no manifest
    (partial / "response.json.part").write_bytes(b"x")
    assert archive.units() == [] and read_answers(archive) == {}
    run(archive, [1, 2], fake)
    assert [e["cui"] for _, body in fake.requests for e in body] == [1, 2]


def test_the_same_batch_twice_on_one_day_does_not_overwrite(archive, fake):
    body = b'{"found": [], "notFound": [1, 2]}'
    archive_batch(archive, [1, 2], date(2026, 11, 12), body, NOW)
    archive_batch(archive, [1, 2], date(2026, 11, 12), body, NOW)
    paths = sorted(u.path.name for u in archive.units())
    assert paths == ["2026-11-12", "2026-11-12.2"]


# ---- resume ------------------------------------------------------------------------------------------------------------


def test_cuis_already_in_an_archived_response_found_or_not_are_skipped(archive):
    first = Fake(unknown=[2])
    run(archive, [1, 2, 3], first)
    second = Fake()
    summary = run(archive, [1, 2, 3, 4, 5], second)
    assert [e["cui"] for _, body in second.requests for e in body] == [4, 5]  # 2 was "not found" and still counts as answered
    assert summary.cuis == 2
    answers = read_answers(archive)
    assert {c: a.found for c, a in answers.items()} == {1: True, 2: False, 3: True, 4: True, 5: True}


def test_a_cui_asked_but_in_neither_list_counts_as_answered_not_found(archive):
    body = json.dumps({"found": [entry(1)], "notFound": []}).encode()  # ANAF dropped 2 without a notFound
    archive_batch(archive, [1, 2], date(2026, 11, 12), body, NOW)
    answers = read_answers(archive)
    assert {c: a.found for c, a in answers.items()} == {1: True, 2: False}
    assert pending([1, 2, 3], answers, today=NOW.date()) == [3]


def test_a_killed_run_resumes_where_it_stopped_with_no_batch_repeated_and_none_lost(archive):
    def die_on_third(n, body):
        if n == 3:
            raise SystemExit(143)  # SIGTERM turned into an exit: raised inside the request

    killed = Fake(script=die_on_third)
    with pytest.raises(SystemExit):
        run(archive, range(1000, 1500), killed)
    assert len(archive.units()) == 2  # two finished batches are archived
    resumed = Fake()
    run(archive, range(1000, 1500), resumed)
    again = [e["cui"] for _, body in resumed.requests for e in body]
    assert again == list(range(1200, 1500))  # exactly what was missing
    assert sorted(read_answers(archive)) == list(range(1000, 1500))
    third = Fake()
    run(archive, range(1000, 1500), third)
    assert third.requests == []  # nothing left to ask


def test_recheck_asks_again_about_answers_older_than_the_given_days(archive, fake):
    run(archive, [1, 2], fake)
    later = lambda: NOW + timedelta(days=400)
    again = Fake()
    lookup(archive, [1, 2, 3], again.client(), now=later, recheck_after_days=365)
    assert [e["cui"] for _, body in again.requests for e in body] == [1, 2, 3]
    fresh = Fake()
    lookup(archive, [1, 2, 3], fresh.client(), now=later, recheck_after_days=365)
    assert fresh.requests == []  # the answers of the previous run are now fresh
    assert pending([1, 2], read_answers(archive), today=later().date()) == []  # without the option, an answer never expires


def test_a_cui_found_by_a_later_lookup_after_a_not_found_is_found(archive):
    run(archive, [9], Fake(unknown=[9]))
    lookup(archive, [9], Fake().client(), now=lambda: NOW + timedelta(days=400), recheck_after_days=365)
    assert read_answers(archive)[9].found is True


def test_max_batches_stops_a_trial_run_early(archive, fake):
    summary = run(archive, range(1000, 1500), fake, max_batches=2)
    assert summary.batches == 2 and len(archive.units()) == 2


# ---- progress ----------------------------------------------------------------------------------------------------------


class Clock:
    def __init__(self):
        self.t = datetime(2026, 11, 12, 10, 0, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.t

    def tick(self, s):
        self.t += timedelta(seconds=s)


def test_a_line_per_batch_a_start_and_a_summary(archive, fake, tmp_path):
    lines, clock = [], Clock()
    progress = AnafProgress(tmp_path / "state" / "anaf-progress.json", out=lines.append, now=clock)
    run(archive, range(1000, 1250), fake, progress)
    assert re.fullmatch(rf"{TS} anaf start cuis=250 batches=3 already_archived=0 archive={re.escape(str(archive.root))} pid=\d+", lines[0])
    assert re.fullmatch(rf"{TS} anaf batch 1/3 cuis=100 found=100 notfound=0 archived={re.escape(str(archive.root))}/anaf/vat/v9/0000001000-100/2026-11-12", lines[1])
    assert re.fullmatch(rf"{TS} anaf batch 3/3 cuis=50 found=50 notfound=0 archived=\S+0000001200-50/2026-11-12", lines[3])
    assert re.fullmatch(rf"{TS} anaf done batches=3 cuis=250 found=250 notfound=0 in 0:00:00", lines[4])
    assert len(lines) == 5  # nothing else: no per-CUI noise, no progress bar


def test_not_found_counts_show_in_the_batch_line(archive, tmp_path):
    lines = []
    run(archive, range(1, 11), Fake(unknown=[3, 4]), AnafProgress(out=lines.append))
    assert " anaf batch 1/1 cuis=10 found=8 notfound=2 " in lines[1]


def test_a_resumed_run_says_how_many_were_already_archived(archive, fake):
    run(archive, range(1000, 1100), fake)
    lines = []
    run(archive, range(1000, 1300), Fake(), AnafProgress(out=lines.append))
    assert " anaf start cuis=200 batches=2 already_archived=100 " in lines[0]


def test_the_status_file_follows_the_run_and_is_replaced_atomically(archive, fake, tmp_path):
    status_file = tmp_path / "state" / "anaf-progress.json"
    seen = []
    fake.on_request = lambda: seen.append(read_status(status_file))  # what `pipeline status` would read just before each request
    run(archive, range(1000, 1250), fake, AnafProgress(status_file, out=lambda line: None))
    assert [(s["state"], s["batchesDone"], s["cuisDone"]) for s in seen] == [("running", 0, 0), ("running", 1, 100), ("running", 2, 200)]
    final = read_status(status_file)
    assert (final["state"], final["batchesTotal"], final["batchesDone"], final["cuisTotal"], final["cuisDone"], final["found"]) == ("finished", 3, 3, 250, 250, 250)
    assert sorted(p.name for p in status_file.parent.iterdir()) == ["anaf-progress.json"]  # no temp file left behind


def test_a_failed_lookup_says_so_and_says_how_to_resume(archive, tmp_path):
    lines, status_file = [], tmp_path / "anaf-progress.json"
    dead = Fake(script=lambda n, body: (503, b"") if n > 1 else None)
    with pytest.raises(AnafError):
        run(archive, range(1000, 1300), dead, AnafProgress(status_file, out=lines.append))
    assert re.search(r"anaf FAILED after 1/3 batches: AnafError: giving up after 7 attempts: HTTP 503; every finished batch is archived, rerun the same command to resume", lines[-1])
    s = read_status(status_file)
    assert s["state"] == "failed" and "HTTP 503" in s["error"]
    assert any("rerun" in line for line in describe_anaf(s))


def test_status_reports_running_finished_or_killed(archive, fake, tmp_path):
    status_file = tmp_path / "anaf-progress.json"
    run(archive, range(1000, 1250), fake, AnafProgress(status_file, out=lambda line: None))
    status = read_status(status_file)
    text = "\n".join(describe_anaf(status, alive=lambda pid: True))
    assert "anaf lookup state: finished" in text and "batches: 3/3 done; cuis: 250/250 (250 found, 0 not found)" in text
    status["state"] = "running"
    assert "state: running" in "\n".join(describe_anaf(status, alive=lambda pid: True))
    killed = "\n".join(describe_anaf(status, alive=lambda pid: False))
    assert "state: interrupted" in killed and "rerun the same command to resume" in killed


# ---- the command -------------------------------------------------------------------------------------------------------


@pytest.fixture
def identity_archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE / "seap", root / "seap")  # the SEAP files only: ANAF has not been asked yet
    return Archive(root)


def test_the_cuis_asked_are_the_archives_authority_and_supplier_cuis_that_pass_the_check_digit(identity_archive):
    lines = []
    cuis = collect_cuis(identity_archive, say=lines.append)
    assert 2000007 in cuis and 1000009 in cuis and 1000017 in cuis and 2000015 in cuis  # valid check digit
    assert 2000001 not in cuis  # fails the check digit
    assert not any(c > 10**9 for c in cuis)  # no CNP (13 digits) and no foreign VAT id reaches ANAF
    assert 103029862 not in cuis  # BG103029862 is not a Romanian CUI
    assert len(lines) == 2 and all(re.match(r"anaf scan unit \d/2 kind=", line) for line in lines)


def test_the_command_scans_asks_archives_and_reports(identity_archive, tmp_path, capsys, monkeypatch):
    fake = Fake()
    monkeypatch.setattr(cli, "AnafClient", lambda endpoint: fake.client())
    status_file = tmp_path / "anaf-progress.json"
    assert cli.main(["--archive", str(identity_archive.root), "anaf-lookup", "--progress-file", str(status_file)]) == 0
    out = capsys.readouterr().out
    assert re.search(rf"{TS} anaf scan done: \d+ distinct CUIs in the archive", out)
    assert re.search(rf"{TS} anaf start cuis=\d+ batches=1 already_archived=0 ", out)
    assert re.search(rf"{TS} anaf batch 1/1 cuis=\d+ found=\d+ notfound=0 archived=", out)
    assert re.search(rf"{TS} anaf done batches=1 ", out)
    asked = {e["cui"] for _, body in fake.requests for e in body}
    assert asked == collect_cuis(identity_archive)
    # and `pipeline status` shows it
    assert cli.main(["--archive", str(identity_archive.root), "status", "--anaf-progress-file", str(status_file), "--progress-file", str(tmp_path / "none.json")]) == 0
    status = capsys.readouterr().out
    assert "no rebuild status" in status and "anaf lookup state: finished" in status and "batches: 1/1 done" in status
    # a second run asks nothing
    fake.requests.clear()
    assert cli.main(["--archive", str(identity_archive.root), "anaf-lookup", "--progress-file", str(status_file)]) == 0
    assert fake.requests == []


@pytest.mark.parametrize(
    "state, inactive, expected",
    [("INREGISTRAT din data 26.11.1992", False, "ACTIV"), ("INREGISTRAT din data 26.11.1992", True, "INACTIV"), ("RADIERE din data 10.03.2022", True, "RADIERE"),
     ("Radiere din data 01.02.2020", False, "RADIERE"), ("FUZIUNE din data 05.05.2019", False, "FUZIUNE"), ("INREGISTRAT din data 01.01.2000 - SUSPENDARE ACTIVITATE", False, "SUSPENDARE"),
     ("", False, "ACTIV"), ("ALTCEVA NOU din data 01.01.2020", False, "ALTCEVA NOU")],
)
def test_status_of_gives_one_word_for_the_badge(state, inactive, expected):
    assert status_of({"date_generale": {"stare_inregistrare": state}, "stare_inactiv": {"statusInactivi": inactive}}) == expected


def test_the_cuis_asked_include_those_of_crawled_days(tmp_path):
    """A supplier first seen in the nightly crawl (published as `RO <cui>`, in no bulk file) must reach ANAF (#66 + #77)."""
    from pipeline.crawl.unitdir import UnitWriter

    now = datetime(2026, 11, 12, 9, 0, tzinfo=timezone.utc)
    archive = Archive(tmp_path / "crawl-only")
    w = UnitWriter.open(archive, "2026-10-01", now)
    notice = {"caNoticeId": 1, "noticeNo": "CAN1", "procedureId": 7, "sysNoticeTypeId": 3, "sysNoticeVersionId": 2,
              "noticeStateDate": "2026-10-01T10:00:00+03:00", "contractTitle": "Titlu", "contractingAuthorityNameAndFN": "1000009 - AUTORITATE EXEMPLU"}
    contract = {"caNoticeContractId": 1, "contractNo": "C1", "contractDate": "2026-09-28T00:00:00+03:00", "defaultCurrencyContractValue": 100,
                "winners": [{"name": "FIRMA SRL", "fiscalNumber": "RO 2000007"}, {"name": "ALTA SRL", "fiscalNumber": "2000001"}]}
    w.put("notices-2026-10-01_2026-10-01-p0000.json", json.dumps({"items": [notice], "total": 1, "searchTooLong": False}).encode())
    w.put("contracts-1-s00000.json", json.dumps({"items": [contract], "total": 1}).encode())
    w.commit(now, "u", {})
    cuis = collect_cuis(archive)
    assert 2000007 in cuis  # the winner, with its RO prefix
    assert 1000009 in cuis  # the authority
    assert 2000001 not in cuis  # fails the check digit
