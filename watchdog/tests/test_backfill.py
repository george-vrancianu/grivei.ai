"""Seam 2 for the backfill (#78): HTTP stubbed (the crawl tests' FakeEli and fake clock), files checked in the raw archive, the
week bookkeeping, resuming, the 2023-today pass against the bulk files of the archive, progress and status lines, the CLI.
No network, no database, nothing slept for real."""
import json
import os
import re
import shutil
from datetime import date
from pathlib import Path

import pytest
import requests
from test_crawl import CONTRACTS, NOTICE_LIST, Clock, FakeEli, contract, make, notice  # the crawl's stubs

from pipeline import cli
from pipeline.archive import Archive
from pipeline.crawl import EliClient, complete_days, cursor
from pipeline.crawl.backfill import (
    MAX_CONSECUTIVE_FAILURES, PASS_2021_22, PASS_2023_TODAY, BulkIndex, PassPlan, Week, archive_summary, complete_weeks, plan_backfill,
    run_backfill, week_windows,
)
from pipeline.crawl.backfill_progress import BackfillProgress, describe_backfill
from pipeline.crawl.records import parse_unit
from pipeline.crawl.unitdir import BACKFILL_KIND, KIND, kind_dir

D = date.fromisoformat
FIXTURE = Path(__file__).parent / "fixtures" / "archive-backfill"
TODAY = D("2026-11-12")


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def archive(tmp_path):
    return Archive(tmp_path / "archive")


@pytest.fixture
def fixture_archive(tmp_path):
    shutil.copytree(FIXTURE, tmp_path / "fixture")
    return Archive(tmp_path / "fixture")


def backfill(archive, eli, clock, *, passes=(PASS_2021_22,), only=None, bulk=None, today=TODAY):
    """One `pipeline backfill` run (what the CLI does), optionally cut down to the weeks inside `only` = (first, last)."""
    crawler, _ = make(archive, eli, clock)
    crawler.kind = BACKFILL_KIND
    lines = []
    progress = BackfillProgress(archive.root / "backfill-progress.json", out=lines.append, now=clock.now)
    crawler._note = progress.note
    crawler.client._log = progress.note
    plans = plan_backfill(archive, today=today, passes=passes, bulk=bulk)
    if only:
        for plan in plans:
            keep = lambda w: only[0] <= w.first and w.last <= only[1]  # noqa: E731
            plan.weeks = [w for w in plan.weeks if keep(w)]
            plan.done = [w for w in plan.done if keep(w)]
            plan.todo = [w for w in plan.todo if keep(w)]
            plan.waiting = {w: why for w, why in plan.waiting.items() if keep(w)}
    summary = run_backfill(archive, crawler, plans, progress, bulk=bulk)
    return summary, lines, progress


def rows(*specs):
    """List rows for one week: (id, noticeNo, procedureId) -> a notice published on the 6th of April 2021."""
    out = []
    for i, code, procedure in specs:
        row = notice(i, "2021-04-06", procedure=procedure)
        row["noticeNo"] = code
        out.append(row)
    return out


def eli_week(*specs, day="2021-04-06"):
    notices = {day: [dict(r, noticeStateDate=f"{day}T10:00:00+03:00") for r in rows(*specs)]}
    return FakeEli(notices, {i: [contract(i * 10, i)] for i, _, _ in specs})


def requested_windows(eli):
    return [(c["body"]["startPublicationDate"][:10], c["body"]["endPublicationDate"][:10]) for c in eli.calls if c["url"].endswith(NOTICE_LIST)]


def contracted(eli):
    return [c["body"]["caNoticeId"] for c in eli.calls if c["url"].endswith(CONTRACTS)]


# ---- weeks over 2021-22 ----------------------------------------------------------------------------------------------------


def test_the_2021_22_pass_is_one_list_query_per_week_from_2021_01_01_to_2022_12_31(archive, clock):
    windows = week_windows(D("2021-01-01"), D("2022-12-31"))
    assert len(windows) == 105 and windows[0] == (D("2021-01-01"), D("2021-01-03")) and windows[1] == (D("2021-01-04"), D("2021-01-10"))
    assert windows[-1] == (D("2022-12-26"), D("2022-12-31"))
    assert all(b + (D("2021-01-02") - D("2021-01-01")) == c for (_, b), (c, _) in zip(windows, windows[1:]))  # no gap, no overlap
    assert all(a.weekday() == 0 for a, _ in windows[1:]) and all(b.weekday() == 6 for _, b in windows[:-1])

    eli = FakeEli()
    summary, _, _ = backfill(archive, eli, clock)
    assert summary.ok and summary.crawled == 105
    assert requested_windows(eli) == [(a.isoformat(), b.isoformat()) for a, b in windows]  # in order, one query each, no other request
    assert eli.paths() == [NOTICE_LIST] * 105


def test_a_week_over_the_cap_is_split_by_the_core_and_still_one_week_unit(archive, clock):
    days = ["2021-04-05", "2021-04-06", "2021-04-07", "2021-04-08"]
    eli = FakeEli({d: [notice(100 + k, d)] for k, d in enumerate(days)}, cap=3)  # 4 rows >= cap: the server says searchTooLong
    summary, _, _ = backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-11")))
    assert summary.ok
    unit = kind_dir(archive, BACKFILL_KIND) / "2021-04-05"
    assert len(list(unit.iterdir())) == 1 and len(list(next(unit.iterdir()).glob("notices-*.json"))) >= 3  # split list pages in one week unit
    assert len({a for a, b in requested_windows(eli) if a == "2021-04-05"}) == 1 and ("2021-04-05", "2021-04-11") in requested_windows(eli)


# ---- selection by procedureId null ---------------------------------------------------------------------------------------


def test_only_rows_without_a_procedure_get_their_contracts_fetched(archive, clock):
    eli = eli_week((11, "CAN11", None), (12, "CAN12", 7), (13, "CAN13", None))
    summary, _, _ = backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-11")))
    assert summary.ok
    assert contracted(eli) == [11, 13]  # the notice with a procedure (12) is dropped: no contract call for it
    directory = next((kind_dir(archive, BACKFILL_KIND) / "2021-04-05").iterdir())
    names = sorted(p.name for p in directory.iterdir())
    assert names == ["contracts-11-s00000.json", "contracts-13-s00000.json", "manifest.json", "notices-2021-04-05_2021-04-11-p0000.json"]
    listed = json.loads((directory / names[3]).read_text())
    assert [r["caNoticeId"] for r in listed["items"]] == [11, 12, 13]  # the list response is archived as it came, dropped rows included
    manifest = json.loads((directory / "manifest.json").read_text())
    assert manifest["via"] == "backfill" and manifest["kind"] == BACKFILL_KIND and manifest["stream"] == "crawl"
    assert {k: manifest["crawl"][k] for k in ("window", "notices", "kept", "contracts", "pass", "week")} == {
        "window": ["2021-04-05", "2021-04-11"], "notices": 3, "kept": 2, "contracts": 2, "pass": "2021-22", "week": "2021-W14"}


def test_the_backfilled_week_loads_as_award_notices_with_their_procedure_type(fixture_archive):
    """What a rebuild reads: a procedureId-null notice is one AWARD_NOTICE carrying its procedure (what `no-publication` selects on)."""
    unit = next(u for u in fixture_archive.units() if u.kind == BACKFILL_KIND and u.unit == "2021-04-05")
    records = parse_unit(unit).records
    assert records["CONTRACT"] == []
    notice_1, notice_2 = records["AWARD_NOTICE"]
    assert (notice_1.code, notice_1.procedure, notice_1.value_bani, notice_1.via) == ("CAN9400001", "Negociere fara publicare prealabila", 350050, "CRAWL")
    assert (notice_2.code, notice_2.procedure) == ("CAN9400002", "Procedura simplificata proprie")
    assert notice_1.url == "https://e-licitatie.ro/pub/notices/ca-notices/view-c/94000011" and notice_1.sys_notice_type_id == 3


# ---- resume ------------------------------------------------------------------------------------------------------------------


def test_a_killed_run_resumes_with_complete_weeks_skipped_and_archived_notices_not_fetched_again(archive, clock):
    specs = {"2021-04-06": [(11, "CAN11", None), (12, "CAN12", None), (13, "CAN13", None)], "2021-04-13": [(14, "CAN14", None)]}
    notices = {d: [dict(r, noticeStateDate=f"{d}T10:00:00+03:00") for r in rows(*s)] for d, s in specs.items()}
    eli = FakeEli(notices, {i: [contract(i * 10, i)] for s in specs.values() for i, _, _ in s})
    span = (D("2021-03-29"), D("2021-04-18"))  # three weeks: 03-29 (empty), 04-05 (3 kept), 04-12 (1 kept)
    eli.die_at = 5  # list 03-29, list 04-05, contracts 11, 12, then the kill during the contracts call of notice 13
    with pytest.raises(SystemExit):
        backfill(archive, eli, clock, only=span)
    held = complete_weeks(archive)
    assert [unit for _, unit in held] == ["2021-03-29"]  # the empty week finished; 04-05 is half done: no manifest, not complete
    week_dir = next((kind_dir(archive, BACKFILL_KIND) / "2021-04-05").iterdir())
    assert sorted(p.name for p in week_dir.iterdir()) == ["contracts-11-s00000.json", "contracts-12-s00000.json", "notices-2021-04-05_2021-04-11-p0000.json"]
    (week_dir / "contracts-13-s00000.json.part").write_bytes(b'{"items": [{"caNotice')  # the write of notice 13 that was cut short
    status = json.loads((archive.root / "backfill-progress.json").read_text())
    assert status["state"] == "failed" and status["passes"]["2021-22"]["crawled"] == 1  # the kill is on record

    again = FakeEli(notices, eli.contracts)
    summary, lines, _ = backfill(archive, again, clock, only=span)
    assert summary.ok and (summary.crawled, summary.skipped) == (2, 1)
    assert contracted(again) == [13, 14]  # 11 and 12 were archived: not asked again; the cut-short file never counted
    assert requested_windows(again) == [("2021-04-12", "2021-04-18")]  # the list of 04-05 came from the archive, 03-29 was complete
    assert any("week 2021-W13" in l and "skipped (complete)" in l for l in lines)
    assert (week_dir / "contracts-13-s00000.json").read_bytes().startswith(b"{")
    manifest = json.loads((week_dir / "manifest.json").read_text())
    assert sorted(f["name"] for f in manifest["files"]) == ["contracts-11-s00000.json", "contracts-12-s00000.json", "contracts-13-s00000.json", "notices-2021-04-05_2021-04-11-p0000.json"]
    assert manifest["crawl"]["contracts"] == 3 and len(complete_weeks(archive)) == 3

    third = FakeEli(notices, eli.contracts)
    summary, _, _ = backfill(archive, third, clock, only=span)
    assert summary.crawled == 0 and summary.skipped == 3 and third.calls == []  # everything complete: nothing is asked


def test_a_failing_week_is_recorded_and_the_run_goes_on_then_a_rerun_retries_it(archive, clock):
    notices = {"2021-04-06": rows((11, "CAN11", None)), "2021-04-13": rows((14, "CAN14", None))}
    eli = FakeEli(notices, {11: [contract(1, 11)], 14: [contract(2, 14)]})
    eli.fail = {n: 500 for n in range(1, 5)}  # the first week's list fails for good (the first try and three retries)
    summary, lines, _ = backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-18")))
    assert not summary.ok and [w.first for w in summary.failed] == [D("2021-04-05")] and summary.crawled == 1
    assert any("backfill week 2021-W14 2021-04-05..2021-04-11 FAILED" in l and "rerun to resume" in l for l in lines)
    assert [unit for _, unit in complete_weeks(archive)] == ["2021-04-12"]
    status = json.loads((archive.root / "backfill-progress.json").read_text())
    assert status["passes"]["2021-22"]["failed"] == 1 and status["failures"][0]["week"] == "2021-W14"
    again = FakeEli(notices, eli.contracts)
    summary, _, _ = backfill(archive, again, clock, only=(D("2021-04-05"), D("2021-04-18")))
    assert summary.ok and len(complete_weeks(archive)) == 2 and contracted(again) == [11]


def test_the_run_stops_after_repeated_failures_in_a_row(archive, clock):
    eli = FakeEli()
    eli.fail = {n: requests.ConnectionError("down") for n in range(1, 400)}
    summary, lines, _ = backfill(archive, eli, clock)
    assert summary.aborted and len(summary.failed) == MAX_CONSECUTIVE_FAILURES and complete_weeks(archive) == {}
    assert "ABORTED" in lines[-1]
    assert json.loads((archive.root / "backfill-progress.json").read_text())["state"] == "aborted"


# ---- the 2023 -> today pass --------------------------------------------------------------------------------------------------


def pass2_rows():
    out = []
    for i, code, procedure in [(1, "CAN9300001", 1), (2, "CAN9300002", 1), (3, "CAN9300011", None), (4, "CAN9400002", None), (5, "CAN9300099", 1), (6, "CAN9400077", None)]:
        row = notice(i, "2023-01-04", procedure=procedure)
        row["noticeNo"] = code
        out.append(row)
    return out


def test_the_2023_to_today_pass_keeps_only_notices_missing_from_both_the_backfill_and_the_2023_bulk(fixture_archive, clock):
    shutil.rmtree(kind_dir(fixture_archive, BACKFILL_KIND) / "2023-01-02")  # as if that week had not been crawled yet
    bulk = BulkIndex.read(fixture_archive)
    assert bulk.codes == {"CAN9300001", "CAN9300003", "CAN9300011"} and bulk.covered == {("contracte", "2023Q1"), ("fara-anunt", "2023Q1")}
    eli = FakeEli({"2023-01-04": pass2_rows()}, {i: [contract(i * 10, i)] for i in range(1, 7)})
    summary, _, _ = backfill(fixture_archive, eli, clock, passes=(PASS_2023_TODAY,), only=(D("2023-01-01"), D("2023-01-08")), bulk=bulk)
    assert summary.ok and summary.crawled == 2  # the single day 2023-01-01 and the week 01-02..01-08
    # 1: in the 2023 Q1 Contracte bulk, 3: in the "fara anunt" bulk, 4: in the 2021-22 backfill (re-dated): dropped. 2, 5 and 6 are in neither.
    assert contracted(eli) == [2, 5, 6]
    manifest = json.loads(next((kind_dir(fixture_archive, BACKFILL_KIND) / "2023-01-02").iterdir()).joinpath("manifest.json").read_text())
    assert manifest["crawl"]["notices"] == 6 and manifest["crawl"]["kept"] == 3 and manifest["crawl"]["pass"] == "2023-today"
    assert manifest["crawl"]["keep"] == "missing_from_bulk_and_backfill"


def test_weeks_the_bulk_cannot_answer_for_wait_and_cost_no_request(fixture_archive, clock):
    bulk = BulkIndex.read(fixture_archive)
    shutil.rmtree(kind_dir(fixture_archive, BACKFILL_KIND) / "2023-01-02")
    plans = plan_backfill(fixture_archive, today=TODAY, passes=(PASS_2023_TODAY,), bulk=bulk)
    plan = plans[0]
    assert plan.weeks[0] == Week(PASS_2023_TODAY, D("2023-01-01"), D("2023-01-01")) and plan.weeks[-1].last == D("2026-11-08")  # whole weeks that are over
    assert [w.first for w in plan.todo][-1] == D("2023-03-20")  # Q1 2023 is the only quarter with both bulk kinds archived; the week 03-27..04-02 straddles Q2, so it waits
    assert len(plan.todo) == 13 and all(w in plan.waiting for w in plan.weeks if w.first >= D("2023-04-03"))
    assert plan.waiting[Week(PASS_2023_TODAY, D("2023-04-03"), D("2023-04-09"))] == "no bulk archived for contracte 2023Q2, fara-anunt 2023Q2"
    eli = FakeEli()
    summary, lines, _ = backfill(fixture_archive, eli, clock, passes=(PASS_2023_TODAY,), bulk=bulk)
    assert summary.ok and summary.waiting == len(plan.waiting) and len(eli.calls) == 13
    assert max(b for _, b in requested_windows(eli)) == "2023-03-26"  # nothing past the last quarter the bulk covers
    assert any("waiting (no bulk archived for contracte 2023Q2" in l for l in lines)
    assert not any(p.name == "2023-04-03" for p in kind_dir(fixture_archive, BACKFILL_KIND).iterdir())


def test_a_bulk_file_that_does_not_validate_counts_as_absent(fixture_archive):
    from datetime import datetime, timezone

    fixture_archive.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q2", fetched_at=datetime(2026, 11, 12, tzinfo=timezone.utc),
                               files={"raport-contracte-t2-2023.csv": b"NR,DATA\nCAN1,2\n"})  # headers nobody knows: the rebuild would quarantine it
    notes = []
    bulk = BulkIndex.read(fixture_archive, notes.append)
    assert ("contracte", "2023Q2") not in bulk.covered and "CAN1" not in bulk.codes and any("2023Q2" in n and "not valid" in n for n in notes)
    assert ("contracte", "2023Q1") in bulk.covered


# ---- the nightly crawl is not touched -----------------------------------------------------------------------------------------


def test_the_backfill_does_not_move_the_nightly_cursor_or_count_as_crawl_days(archive, clock):
    from pipeline.crawl import Crawler

    nightly = FakeEli({"2026-10-01": [notice(1, "2026-10-01")]}, {1: [contract(1, 1)]})
    crawler, _ = make(archive, nightly, clock)
    crawler.crawl_unit("2026-10-01", D("2026-10-01"), D("2026-10-01"))
    assert cursor(archive) == D("2026-10-01")

    eli = eli_week((11, "CAN11", None))
    summary, _, _ = backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-11")))
    assert summary.ok and len(complete_weeks(archive)) == 1
    assert cursor(archive) == D("2026-10-01") and set(complete_days(archive)) == {D("2026-10-01")}  # the week is not a crawl day
    assert [p.name for p in kind_dir(archive, KIND).iterdir()] == ["2026-10-01"]  # apart: its own kind directory
    assert [p.name for p in kind_dir(archive, BACKFILL_KIND).iterdir()] == ["2021-04-05"]
    assert isinstance(crawler, Crawler) and crawler.kind == KIND


# ---- progress and status ------------------------------------------------------------------------------------------------------


def test_the_log_has_start_week_and_summary_lines_with_counts_and_an_eta(archive, clock):
    eli = eli_week((11, "CAN11", None), (12, "CAN12", 7), (13, "CAN13", None))
    _, lines, _ = backfill(archive, eli, clock, only=(D("2021-03-29"), D("2021-04-18")))
    stamp = r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4} "
    assert all(re.match(stamp + "backfill ", l) for l in lines)
    assert re.match(stamp + r"backfill start passes=2021-22 weeks=3 to_do=3 archive=.*pid=\d+$", lines[0])
    assert any(re.match(stamp + r"backfill unit 2021-04-05 notices page 1 window=2021-04-05..2021-04-11 rows=3/3$", l) for l in lines)
    week = [l for l in lines if "week 2021-W14" in l]
    assert len(week) == 1 and re.match(stamp + r"backfill week 2021-W14 2021-04-05..2021-04-11 listed=3 kept=2 contracts=2 pages=1 requests=3 in [\d.]+s \(pass 2021-22 week 2/3, eta \d+:\d\d:\d\d\)$", week[0])
    assert re.match(stamp + r"backfill done weeks=3/3 crawled=3 skipped=0 waiting=0 failed=0 listed=3 kept=2 contracts=2 requests=5 in \d+:\d\d:\d\d$", lines[-1])


def test_the_status_file_follows_the_run_is_replaced_atomically_and_reports_per_pass(archive, clock, monkeypatch):
    seen = []
    real = os.replace
    monkeypatch.setattr("pipeline.progress.os.replace", lambda a, b: (seen.append((Path(a).name, Path(b).name)), real(a, b))[1])
    eli = eli_week((11, "CAN11", None))
    backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-18")))
    status = json.loads((archive.root / "backfill-progress.json").read_text())
    assert status["state"] == "finished" and status["passes"]["2021-22"] == {
        "total": 2, "done": 2, "crawled": 2, "skipped": 0, "waiting": 0, "failed": 0, "listed": 1, "kept": 1, "contracts": 1, "requests": 3}
    assert status["lastCompleteWeek"]["window"] == "2021-04-12..2021-04-18"
    seen = [(src, dst) for src, dst in seen if dst == "backfill-progress.json"]
    assert len(seen) > 3 and all(src.startswith(".backfill-progress.json.") for src, dst in seen)
    assert sorted(p.name for p in archive.root.iterdir()) == ["backfill-progress.json", "seap"]  # no stray temp file


def test_status_shows_weeks_done_of_total_last_week_kept_contracts_and_failures(archive, clock, capsys):
    notices = {"2021-04-06": rows((11, "CAN11", None), (12, "CAN12", 5), (13, "CAN13", None))}
    eli = FakeEli(notices, {11: [contract(1, 11), contract(2, 11)], 13: [contract(3, 13)]})
    backfill(archive, eli, clock, only=(D("2021-04-05"), D("2021-04-11")))
    assert archive_summary(archive) == {"2021-22": {"weeks": 1, "listed": 3, "kept": 2, "contracts": 3, "last": "2021-04-11"}}
    assert cli.main(["--archive", str(archive.root), "backfill", "--status"]) == 0
    out = capsys.readouterr().out
    assert "backfill pass 2021-22: weeks complete 1/105, 2 notices kept of 3 listed, 3 contracts fetched, last complete week 2021-04-11" in out
    assert "backfill run: finished" in out and "backfill run pass 2021-22: 1/1 weeks (1 crawled, 0 already complete, 0 waiting for bulk, 0 failed)" in out
    assert cli.main(["--archive", str(archive.root), "status"]) == 0  # `status` carries the same section
    assert "backfill pass 2021-22: weeks complete 1/105" in capsys.readouterr().out


def test_status_says_a_killed_backfill_was_interrupted_and_a_failed_one_failed(archive, clock, capsys):
    progress = BackfillProgress(archive.root / "backfill-progress.json", out=lambda line: None, now=clock.now)
    plan = PassPlan("2021-22", [Week("2021-22", D("2021-04-05"), D("2021-04-11"))], todo=[Week("2021-22", D("2021-04-05"), D("2021-04-11"))])
    progress.start([plan], archive.root)
    progress.state["pid"] = 2**22 + 12345  # a process that is gone
    progress._write()
    assert cli.main(["--archive", str(archive.root), "backfill", "--status"]) == 1
    out = capsys.readouterr().out
    assert "backfill run: interrupted" in out and "rerun the same command to resume" in out
    assert any("running? (cannot see" in l for l in describe_backfill(progress.state, {}, {}, host="another-host"))


# ---- the command --------------------------------------------------------------------------------------------------------------


def test_the_backfill_command_runs_logs_to_stdout_and_a_rerun_asks_nothing(archive, clock, capsys, monkeypatch):
    eli = eli_week((11, "CAN11", None))
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, delay=delay, log=log))
    code = cli.main(["--archive", str(archive.root), "backfill", "--pass", "2021-22", "--delay", "0"])
    out = capsys.readouterr().out
    assert code == 0 and "backfill week 2021-W14 2021-04-05..2021-04-11 listed=1 kept=1 contracts=1" in out and "backfill done weeks=105/105 crawled=105" in out
    calls = len(eli.calls)
    assert cli.main(["--archive", str(archive.root), "backfill", "--pass", "2021-22"]) == 0
    out = capsys.readouterr().out
    assert "skipped (complete)" in out and "crawled=0 skipped=105" in out and len(eli.calls) == calls
    assert cursor(archive) is None  # the nightly crawl's cursor is untouched


def test_the_backfill_command_exits_nonzero_when_weeks_fail(archive, clock, capsys, monkeypatch):
    eli = FakeEli()
    eli.fail = {n: 500 for n in range(1, 9)}
    monkeypatch.setattr(cli, "make_client", lambda delay, log: EliClient(post=eli.post, sleep=clock.sleep, clock=clock.monotonic, delay=delay, log=log))
    assert cli.main(["--archive", str(archive.root), "backfill", "--pass", "2021-22"]) == 1
    assert "backfill week 2021-W53" not in capsys.readouterr().out
