"""Seam 2 for the refresh run (#81): a fake clock, fake steps (or the real crawl over a stubbed e-licitatie), stubbed pings, the ledger and
`pipeline status` as the outside sees them. No network, no database, nothing slept for real."""
import errno
import json
from datetime import date, datetime, timedelta, timezone

import pytest
import requests

from pipeline import cli
from pipeline.anaf import AnafClient, AnafError
from pipeline.archive import Archive
from pipeline.crawl import EliClient
from pipeline.datagov import FetchSummary
from pipeline.mf.fetch import MfFetchSummary
from pipeline.rebuild import RebuildSummary
from pipeline.refresh import DeterministicError, Ledger, Pinger, StepResult, TransientError, classify, run_refresh, run_seed
from pipeline.refresh.engine import BACKOFF, LOCK_NAME
from pipeline.refresh.ledger import LEDGER_NAME
from test_crawl import FakeEli, contract, notice

START = datetime(2026, 11, 12, 3, 0, tzinfo=timezone.utc)


class Clock:
    def __init__(self, start=START):
        self.moment, self.slept = start, []

    def now(self):
        return self.moment

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.moment += timedelta(seconds=seconds)

    def next_day(self, days=1):
        self.moment = self.moment.replace(hour=3, minute=0) + timedelta(days=days)


class Pings:
    """Stands in for requests.post: records what healthchecks.io would have been sent."""

    def __init__(self):
        self.calls = []

    def __call__(self, url, data=None, timeout=None):
        self.calls.append((url, (data or b"").decode()))

    @property
    def urls(self):
        return [u for u, _ in self.calls]


class FakeImpl:
    """Four steps that record that they ran; `fail[name]` is a list of exceptions to raise on the next calls, `writes[name]` writes a unit
    into the archive (new data), `warn[name]` gives the step a suspicious-success warning."""

    def __init__(self, archive):
        self.archive, self.ran, self.fail, self.writes, self.warn, self.n = archive, [], {}, set(), {}, 0

    def _step(self, name):
        self.ran.append(name)
        if self.fail.get(name):
            raise self.fail[name].pop(0)
        if name in self.writes:
            self.n += 1
            self.archive.write_unit(source=name, stream="s", kind="k", unit=f"u{self.n}", fetched_at=START + timedelta(minutes=self.n), files={"f": b"x"})
        return StepResult({"n": 1}, [], list(self.warn.get(name, [])))

    def crawl(self): return self._step("crawl")
    def datagov(self): return self._step("datagov")
    def anaf(self): return self._step("anaf")
    def load(self): return self._step("load")


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


@pytest.fixture
def pings():
    return Pings()


@pytest.fixture
def impl(archive):
    return FakeImpl(archive)


@pytest.fixture
def go(archive, impl, clock, pings):
    lines = []

    def run(**kw):
        result = run_refresh(archive, impl, pinger=Pinger("https://hc.example/ping/abc", post=pings), now=clock.now, sleep=clock.sleep, say=lines.append, **kw)
        run.lines = lines
        return result
    return run


# ---- what is due ----------------------------------------------------------------------------------------------------------


def test_a_first_run_runs_every_step_in_order_crawl_datagov_anaf_load_and_pings_success(go, impl, pings):
    result = go()
    assert (result.status, result.exit_code) == ("ok", 0)
    assert impl.ran == ["crawl", "datagov", "anaf", "load"]  # ANAF before the load: the load reads the archived answers
    assert pings.urls == ["https://hc.example/ping/abc"]  # a success ping, not /fail
    assert "4 step(s) ran" in pings.calls[0][1]


def test_a_duplicate_trigger_finds_nothing_due_and_still_pings_success(go, impl, clock, pings):
    go()
    impl.ran.clear()
    clock.moment += timedelta(hours=2)  # the on-boot trigger after the 03:00 one
    result = go()
    assert impl.ran == []
    assert result.status == "ok" and not result.run["steps"]
    assert pings.calls[-1] == ("https://hc.example/ping/abc", "refresh ok, nothing due")


def test_the_next_day_only_the_crawl_is_due_and_a_load_only_follows_new_files(go, impl, clock):
    go()
    impl.ran.clear()
    clock.next_day()
    go()
    assert impl.ran == ["crawl"]  # data.gov.ro waits for its 7 days; nothing new, so no ANAF and no load
    impl.ran.clear()
    impl.writes.add("crawl")
    clock.next_day()
    go()
    assert impl.ran == ["crawl", "anaf", "load"]  # the crawl archived a day: ANAF for its CUIs, then the load


def test_data_gov_ro_is_due_again_after_seven_days_and_anaf_follows_what_it_archives(go, impl, clock):
    go()
    impl.ran.clear()
    impl.writes.add("datagov")
    for _ in range(6):
        clock.next_day()
        go()
    assert "datagov" not in impl.ran
    clock.next_day()
    go()
    assert impl.ran[-3:] == ["datagov", "anaf", "load"]


def test_the_ledger_records_each_step_with_times_counts_and_the_archive_paths_it_touched(go, impl, archive, clock):
    impl.writes.add("crawl")
    go()
    run = Ledger(archive.root / "refresh-ledger.json").runs[-1]
    crawl = run["steps"][0]
    assert (run["status"], run["started"], [s["name"] for s in run["steps"]]) == ("ok", "2026-11-12T03:00:00Z", ["crawl", "datagov", "anaf", "load"])
    assert crawl["status"] == "ok" and crawl["counts"] == {"n": 1} and crawl["ended"] and crawl["touched"] == ["crawl/s/k/u1/2026-11-12"]


# ---- the lock -------------------------------------------------------------------------------------------------------------


def test_the_lock_blocks_a_second_run_while_the_first_is_working(archive, clock, pings):
    inner = []

    class Reentrant(FakeImpl):
        def crawl(self):
            inner.append(run_refresh(archive, FakeImpl(archive), pinger=Pinger("https://hc.example/x", post=pings), now=clock.now, say=lambda _: None))
            return super().crawl()

    run_refresh(archive, Reentrant(archive), pinger=Pinger("https://hc.example/x", post=pings), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert [r.status for r in inner] == ["locked"]
    assert inner[0].exit_code == 0 and inner[0].run is None  # blocked, not failed: no ledger entry, no ping
    assert len(pings.calls) == 1  # only the outer run pinged
    assert len(Ledger(archive.root / "refresh-ledger.json").runs) == 1
    assert (archive.root / LOCK_NAME).exists()


def test_a_run_killed_midway_is_closed_as_interrupted_by_the_next_one_and_its_steps_come_back_due(go, impl, archive, clock):
    impl.fail["anaf"] = [SystemExit(143)]
    with pytest.raises(SystemExit):
        go()
    ledger = Ledger(archive.root / "refresh-ledger.json")
    assert ledger.runs[-1]["status"] == "interrupted" and ledger.runs[-1]["steps"][-1]["status"] == "interrupted"
    impl.ran.clear()
    go()  # the lock was released by the dying process
    assert impl.ran == ["anaf", "load"]  # crawl and data.gov.ro had succeeded; the killed ANAF and the load are due


# ---- failure classes ------------------------------------------------------------------------------------------------------


def test_the_classes():
    assert classify(requests.ConnectionError("x")) == "transient"
    assert classify(TransientError("x")) == "transient"
    assert classify(TimeoutError()) == "transient"
    assert classify(DeterministicError("x")) == "deterministic"
    assert classify(ValueError("a bug")) == "deterministic"
    assert classify(FileNotFoundError("gone")) == "deterministic"
    assert classify(OSError(errno.ENOSPC, "No space left on device")) == "deterministic"  # a full disk does not clear by itself
    assert classify(OSError(errno.ECONNRESET, "reset")) == "transient"


def test_an_anaf_outage_that_outlasts_the_retries_is_transient_but_a_refused_request_is_not():
    down = AnafClient(post=lambda *a, **k: (503, b""), endpoint="x", sleep=lambda s: None, min_interval=0, retries=2)
    with pytest.raises(AnafError) as outage:
        down.query([123], date(2026, 11, 12))
    assert "giving up" in str(outage.value) and classify(outage.value) == "transient"
    refused = AnafClient(post=lambda *a, **k: (400, b""), endpoint="x", sleep=lambda s: None, min_interval=0)
    with pytest.raises(AnafError) as bad:
        refused.query([123], date(2026, 11, 12))
    assert classify(bad.value) == "deterministic"


def test_an_anaf_outage_is_retried_and_pings_nothing_on_the_first_night(go, impl, pings):
    down = AnafClient(post=lambda *a, **k: (503, b""), endpoint="x", sleep=lambda s: None, min_interval=0, retries=0)
    try:
        down.query([1], date(2026, 11, 12))
    except AnafError as e:
        impl.fail["anaf"] = [e, e, e]
    result = go()
    assert result.status == "failed" and result.alert is None and pings.calls == []  # transient: no alert until more than 2 runs in a row


def test_a_transient_failure_is_retried_with_backoff_and_a_success_on_retry_is_a_plain_success(go, impl, clock, pings):
    impl.fail["datagov"] = [requests.ConnectionError("reset"), requests.Timeout("slow")]
    result = go()
    assert result.status == "ok"
    assert clock.slept == list(BACKOFF)  # 60s, then 300s, on the fake clock
    assert result.run["steps"][1]["attempts"] == 3
    assert pings.urls == ["https://hc.example/ping/abc"]


def test_a_transient_failure_alerts_only_after_more_than_two_failed_runs_in_a_row(go, impl, clock, pings):
    for day in (1, 2, 3):
        impl.fail["crawl"] = [requests.ConnectionError("down")] * 3
        result = go()
        assert result.status == "failed" and result.exit_code == 1
        assert result.run["steps"][0]["failureClass"] == "transient"
        assert day > 1 or impl.ran[-3:] == ["datagov", "anaf", "load"]  # the other steps still ran on the first day
        if day < 3:
            assert pings.calls == [] and result.alert is None  # silence: the dead-man's switch covers a longer outage
        clock.next_day()
    assert pings.urls == ["https://hc.example/ping/abc/fail"]
    reason = pings.calls[0][1]
    assert "3 failed runs in a row" in reason and "crawl" in reason and "down" in reason and "\n" not in reason  # one line
    # recovery: the step stayed due, and a success ping follows
    impl.fail.clear()
    result = go()
    assert result.status == "ok" and "crawl" in [s["name"] for s in result.run["steps"]]
    assert pings.urls[-1] == "https://hc.example/ping/abc"
    assert Ledger(impl.archive.root / "refresh-ledger.json").consecutive_failed_runs() == 0


def test_a_deterministic_failure_is_not_retried_and_alerts_now(go, impl, clock, pings):
    impl.fail["load"] = [DeterministicError("header mismatch")]
    result = go()
    assert result.status == "failed" and impl.ran.count("load") == 1 and clock.slept == []
    assert pings.urls == ["https://hc.example/ping/abc/fail"]
    assert pings.calls[0][1] == "deterministic failure: load: DeterministicError: header mismatch"


def test_an_unknown_exception_counts_as_deterministic(go, impl, pings):
    impl.fail["anaf"] = [KeyError("boom")]
    go()
    assert pings.urls == ["https://hc.example/ping/abc/fail"] and "anaf" in pings.calls[0][1]


def test_a_suspicious_success_loads_and_warns_in_the_success_ping(go, impl, pings, archive):
    impl.warn["load"] = ["quarantined (not loaded, shown as not yet loaded): da/2022Q2"]
    result = go()
    assert result.status == "ok" and result.alert is None
    assert pings.urls == ["https://hc.example/ping/abc"]  # not /fail
    assert "suspicious success" in pings.calls[0][1] and "load: quarantined" in pings.calls[0][1]
    assert Ledger(archive.root / "refresh-ledger.json").runs[-1]["steps"][-1]["warnings"]


def test_no_healthcheck_url_means_no_pings_and_a_log_line(archive, impl, clock, caplog):
    caplog.set_level("INFO", logger="pipeline.refresh")
    result = run_refresh(archive, impl, pinger=Pinger(None, post=lambda *a, **k: pytest.fail("pinged")), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert result.status == "ok"
    assert "no PIPELINE_HEALTHCHECK_URL set" in caplog.text


def test_a_ping_that_cannot_be_sent_does_not_fail_the_run(archive, impl, clock):
    def broken(*a, **k):
        raise requests.ConnectionError("hc down")
    assert run_refresh(archive, impl, pinger=Pinger("https://hc.example/x", post=broken), now=clock.now, say=lambda _: None).status == "ok"


# ---- seed -----------------------------------------------------------------------------------------------------------------


def test_the_seed_runs_datagov_anaf_load_in_that_order_and_a_second_seed_skips_what_is_done(archive, impl, clock):
    impl.backfill = lambda: StepResult()
    kw = dict(now=clock.now, sleep=clock.sleep, say=lambda _: None)
    impl.fail["load"] = [DeterministicError("no db")]
    assert run_seed(archive, impl, **kw).exit_code == 1
    assert impl.ran == ["datagov", "anaf", "load"]
    impl.ran.clear()
    assert run_seed(archive, impl, backfill=True, **kw).exit_code == 0
    assert impl.ran == ["load"]  # resumed at the step that failed
    impl.ran.clear()
    run_seed(archive, impl, **kw)
    assert impl.ran == []
    run_seed(archive, impl, again=True, **kw)
    assert impl.ran == ["datagov", "anaf", "load"]


def test_after_a_seed_the_first_refresh_does_not_repeat_datagov_anaf_or_load(archive, impl, clock, go):
    run_seed(archive, impl, now=clock.now, sleep=clock.sleep, say=lambda _: None)
    impl.ran.clear()
    go()
    assert impl.ran == ["crawl"]


# ---- the real steps through the CLI ---------------------------------------------------------------------------------------


@pytest.fixture
def cli_world(archive, monkeypatch):
    """`pipeline refresh` with the network and the database stubbed at the CLI's own seams."""
    today = datetime.now(timezone.utc).date()
    day = (today - timedelta(days=2)).isoformat()
    eli = FakeEli({day: [notice(1, day)]}, {1: [contract(1, 1)]})
    clock = Clock()
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=lambda: clock.moment.timestamp(), log=log, delay=0))
    monkeypatch.setattr(cli, "fetch_datagov", lambda a: FetchSummary())
    monkeypatch.setattr(cli, "fetch_mf", lambda a: MfFetchSummary())
    monkeypatch.setattr(cli, "AnafClient", lambda endpoint=None: AnafClient(post=lambda *a, **k: pytest.fail("ANAF has no CUI to ask about"), endpoint=endpoint or "x"))
    loads = []

    def fake_rebuild(archive_, db, *a, **k):
        loads.append(db)
        a[0].finish(1, {"CONTRACT": "2026-11-10", "DA": "2022-06-30"})  # the rebuild's status file, with the data-through dates
        summary = RebuildSummary(files_loaded=1, records=1)
        summary.quarantined = [archive_.root / "quarantine" / "seap/bulk/da/2022Q2/2022-07-01"]
        return summary
    monkeypatch.setattr(cli, "rebuild", fake_rebuild)
    monkeypatch.setenv("PIPELINE_CRAWL_START", (today - timedelta(days=3)).isoformat())
    monkeypatch.setenv("PIPELINE_CRAWL_DELAY", "0")
    monkeypatch.setenv("PIPELINE_REBUILD_IN_PLACE", "1")  # the fake rebuild has no database to switch
    monkeypatch.delenv("PIPELINE_HEALTHCHECK_URL", raising=False)
    return eli, loads, day


def test_refresh_at_the_cli_crawls_loads_and_status_shows_runs_cursor_data_through_and_quarantines(cli_world, archive, capsys):
    eli, loads, day = cli_world
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=START, files={"f.csv": b"x"})
    archive.quarantine(archive.units()[0], "header mismatch (fixture)")
    assert cli.main(["--archive", str(archive.root), "refresh", "--db", "postgresql://x/y", "--trigger", "timer"]) == 0
    out = capsys.readouterr().out
    assert "step crawl: ok" in out and "step datagov: ok" in out and "step anaf: ok" in out and "step load: ok" in out
    assert loads == ["postgresql://x/y"]
    assert cli.main(["--archive", str(archive.root), "refresh", "--db", "postgresql://x/y"]) == 0
    assert "step crawl: not due" in capsys.readouterr().out and loads == ["postgresql://x/y"]  # a duplicate trigger loads nothing

    cli.main(["--archive", str(archive.root), "status"])
    status = capsys.readouterr().out
    assert "#2 refresh" in status and "#1 refresh" in status
    assert "crawl ok, datagov ok, anaf ok, load ok" in status
    assert "load warning: quarantined (not loaded, shown as not yet loaded)" in status
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    assert f"crawl cursor: {yesterday}" in status
    assert "data through (as of this rebuild): CONTRACT 2026-11-10, DA 2022-06-30" in status
    assert "quarantine: 1 open" in status and "seap/bulk/da/2022Q2" in status and "header mismatch (fixture)" in status
    assert "refresh: due now: nothing" in status


def test_refresh_without_a_database_is_a_deterministic_failure_that_pings_fail(cli_world, archive, monkeypatch, capsys):
    pings = Pings()
    monkeypatch.setattr("pipeline.refresh.pings.requests.post", pings)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    code = cli.main(["--archive", str(archive.root), "refresh", "--healthcheck-url", "https://hc.example/ping/z"])
    assert code == 1
    assert pings.urls == ["https://hc.example/ping/z/fail"] and "no database" in pings.calls[0][1]


def test_crawl_with_no_cursor_and_nothing_to_start_after_is_deterministic(cli_world, archive, monkeypatch, capsys):
    monkeypatch.delenv("PIPELINE_CRAWL_START")
    assert cli.main(["--archive", str(archive.root), "refresh", "--db", "postgresql://x/y"]) == 1
    assert "deterministic failure" in capsys.readouterr().out


def test_seed_at_the_cli_runs_datagov_anaf_load_once_and_a_second_seed_skips_them(cli_world, archive, capsys):
    eli, loads, day = cli_world
    argv = ["--archive", str(archive.root), "seed", "--db", "postgresql://x/y"]
    assert cli.main(argv) == 0
    out = capsys.readouterr().out
    assert out.index("step datagov: ok") < out.index("step anaf: ok") < out.index("step load: ok")  # ANAF before the load
    assert "step crawl" not in out and eli.calls == []  # the seed does not crawl
    assert cli.main(argv) == 0
    assert "step load: not due" in capsys.readouterr().out and len(loads) == 1


# ---- review fixes (round 1) -----------------------------------------------------------------------------------------------


def test_a_seed_stops_at_the_first_failed_step_and_a_resumed_seed_carries_on_from_it(archive, impl, clock):
    kw = dict(now=clock.now, sleep=clock.sleep, say=lambda _: None)
    impl.fail["datagov"] = [TransientError("down")] * 3
    assert run_seed(archive, impl, **kw).exit_code == 1
    assert impl.ran == ["datagov"] * 3  # retried, then the seed stops: anaf and the (hours-long) load did not run on a partial archive
    impl.ran.clear()
    assert run_seed(archive, impl, **kw).exit_code == 0
    assert impl.ran == ["datagov", "anaf", "load"]  # the resume does everything that was left


def test_a_refresh_keeps_going_after_a_failed_step(go, impl):
    impl.fail["datagov"] = [TransientError("down")] * 3
    assert go().status == "failed"
    assert impl.ran == ["crawl", "datagov", "datagov", "datagov", "anaf", "load"]  # its due rules are fingerprint-based, so the next run repairs


def test_an_error_in_a_steps_due_pings_fail_at_once_and_marks_the_run_interrupted(archive, impl, clock, pings, monkeypatch):
    def boom(archive_, **k):
        raise PermissionError("cannot read the archive")
    monkeypatch.setattr("pipeline.refresh.engine.archive_fingerprint", boom)
    with pytest.raises(PermissionError):
        run_refresh(archive, impl, pinger=Pinger("https://hc.example/p", post=pings), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert pings.urls == ["https://hc.example/p/fail"] and "PermissionError" in pings.calls[0][1]
    assert Ledger(archive.root / LEDGER_NAME).runs[-1]["status"] == "interrupted"


def test_a_warning_that_comes_back_every_night_does_not_make_each_success_suspicious_again(go, impl, clock, pings):
    impl.warn["datagov"] = ["data.gov.ro dataset missing: 2027"]
    impl.warn["load"] = ["coverage: 2024-Q4 CONTRACT possibly incomplete"]
    go()
    assert "suspicious success" in pings.calls[-1][1]  # new the first time
    clock.next_day(7)  # datagov due again; the archive is unchanged so the load is not
    impl.writes.add("crawl")
    go()
    assert "suspicious success" not in pings.calls[-1][1]  # the same flags as last time
    impl.warn["datagov"] = ["data.gov.ro dataset missing: 2027", "data.gov.ro resource not classified: new.csv"]
    clock.next_day(7)
    go()
    assert "new.csv" in pings.calls[-1][1] and "missing: 2027" not in pings.calls[-1][1]  # only what is new


def test_a_corrupt_ledger_is_moved_aside_not_overwritten(archive, impl, clock):
    archive.root.mkdir(parents=True)
    (archive.root / LEDGER_NAME).write_text("{not json")
    run_refresh(archive, impl, now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert [p.name for p in archive.root.glob(LEDGER_NAME + ".corrupt-*")] and len(Ledger(archive.root / LEDGER_NAME).runs) == 1


# ---- load-quarter and the lock of the manual rebuild verbs ----------------------------------------------------------------


def test_load_quarter_rejects_a_bad_quarter_and_an_empty_one(cli_world, archive, capsys):
    base = ["--archive", str(archive.root), "load-quarter"]
    assert cli.main(base + ["2023-Q2", "--db", "postgresql://x/y"]) == 2
    assert cli.main(base + ["2023Q5", "--db", "postgresql://x/y"]) == 2
    assert cli.main(base + ["2023Q2", "--db", "postgresql://x/y"]) == 1
    assert "nothing archived for 2023Q2" in capsys.readouterr().err


def test_load_quarter_requeues_the_quarantined_file_and_exits_1_while_it_is_still_quarantined(cli_world, archive, monkeypatch, capsys):
    eli, loads, day = cli_world
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=START, files={"f.csv": b"x"})
    archive.quarantine(archive.units()[0], "header mismatch (fixture)")
    argv = ["--archive", str(archive.root), "load-quarter", "2022q2", "--db", "postgresql://x/y"]

    def requarantine(a, db, *x, **k):
        loads.append(db)
        archive.quarantine(archive.units()[0], "header mismatch (fixture)")
        return RebuildSummary()
    monkeypatch.setattr(cli, "rebuild", requarantine)
    assert cli.main(argv) == 1  # the rebuild meets the same bad file again
    out = capsys.readouterr().out
    assert "requeued" in out and "still quarantined" in out and len(loads) == 1


def test_load_quarter_exits_0_when_the_quarter_loads(cli_world, archive, monkeypatch, capsys):
    eli, loads, day = cli_world
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=START, files={"f.csv": b"x"})
    monkeypatch.setattr(cli, "rebuild", lambda a, db, *x, **k: loads.append(db) or RebuildSummary(files_loaded=1, records=1))
    assert cli.main(["--archive", str(archive.root), "load-quarter", "2022Q2", "--db", "postgresql://x/y"]) == 0
    assert loads == ["postgresql://x/y"]


def test_rebuild_and_load_quarter_refuse_to_run_while_a_refresh_holds_the_lock(cli_world, archive, monkeypatch, capsys):
    eli, loads, day = cli_world
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=START, files={"f.csv": b"x"})
    from pipeline.refresh.engine import locked
    with locked(archive) as got:
        assert got
        assert cli.main(["--archive", str(archive.root), "rebuild", "--db", "postgresql://x/y"]) == 1
        assert cli.main(["--archive", str(archive.root), "load-quarter", "2022Q2", "--db", "postgresql://x/y"]) == 1
    assert loads == [] and "holds the archive's lock" in capsys.readouterr().err
