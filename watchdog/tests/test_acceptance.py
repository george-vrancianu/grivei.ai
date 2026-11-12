"""The Release 1 acceptance checks (#91) without a database: batch items, the comparison, the unattended week from a ledger file.
tests/test_bench_db.py runs the validation fixture against a rebuilt graph."""
import json
from datetime import date

import pytest

from pipeline import cli
from pipeline.acceptance import Item, check_week, compare, fixture_items, quarter_of, to_bani, week_report
from pipeline.refresh.ledger import LEDGER_NAME


def test_values_become_exact_bani_and_zero_is_no_value():
    assert to_bani(375133.75) == 37513375 and to_bani(915.2) == 91520 and to_bani(1072) == 107200
    assert to_bani(0) is None and to_bani(None) is None and to_bani("x") is None
    assert to_bani(0.1 + 0.2) == 30  # a float's noise does not leak into bani


def test_the_quarter_is_the_published_day():
    assert quarter_of("2024-03-31T23:59:59+02:00") == "2024Q1" and quarter_of("2024-04-01T00:00:00+03:00") == "2024Q2"


BATCH = {
    "authority": {"name": "MUNICIPIUL X"},
    "da": [
        {"code": "DA1", "state": "Oferta acceptata", "pub": "2024-05-01T10:00:00+03:00", "val": 100.5},
        {"code": "DA2", "state": "Oferta refuzata", "pub": "2024-05-02T10:00:00+03:00", "val": 5},
        {"code": "DA3", "state": "Oferta acceptata", "pub": "2024-08-02T10:00:00+03:00", "val": 7},
    ],
    "notices": [
        {"noticeNo": "CAN10", "procedureId": 77, "date": "2024-05-10T10:00:00+03:00"},
        {"noticeNo": "CAN11", "procedureId": None, "date": "2024-06-10T10:00:00+03:00"},
    ],
    "contracts": [
        {"noticeNo": "CAN10", "contractNo": "1/A", "date": "2024-05-12T00:00:00+03:00", "valueRon": 1000},
        {"noticeNo": "CAN11", "contractNo": "7", "date": "2024-06-12T00:00:00+03:00", "valueRon": 10},
        {"noticeNo": "CAN11", "contractNo": "8", "date": "2024-06-13T00:00:00+03:00", "valueRon": 5.5},
        {"noticeNo": "CAN03", "contractNo": "9", "date": "2024-02-02T00:00:00+02:00", "valueRon": 3},  # a subsequent contract of an older notice
    ],
}


def test_a_batch_becomes_da_contract_and_award_notice_items():
    items = fixture_items(BATCH)
    assert [(i.kind, i.record_kind, i.code, i.quarter, i.value_bani) for i in items] == [
        ("da", "DA", "DA1", "2024Q2", 10050),
        ("da", "DA", "DA3", "2024Q3", 700),
        ("contracts", "CONTRACT", "CAN10~1/A", "2024Q2", 100000),
        ("contracts", "AWARD_NOTICE", "CAN11", "2024Q2", 1550),  # the notice without a procedure: once, the sum of its contracts
        ("contracts", "CONTRACT", "CAN03~9", "2024Q1", 300),
    ]
    assert len(fixture_items(BATCH, state=None)) == len(items) + 1  # every DA state


def test_only_items_inside_a_loaded_bulk_quarter_are_compared_and_value_or_kind_differences_are_not_matches():
    loaded = {"DA": {"2024Q2"}, "CONTRACT": {"2024Q2"}, "AWARD_NOTICE": {"2024Q2"}}
    graph = {"DA1": ("DA", 10050), "CAN10~1/A": ("CONTRACT", 99999), "CAN11": ("AWARD_NOTICE", 1550)}
    r = compare(fixture_items(BATCH), loaded, graph)
    assert (r["da"].matched, r["da"].total, r["da"].out_of_scope) == (1, 1, 1)  # DA3 is 2024Q3: not loaded
    assert (r["contracts"].matched, r["contracts"].total, r["contracts"].out_of_scope) == (1, 2, 1)
    assert len(r["contracts"].different) == 1 and "CAN10~1/A" in r["contracts"].different[0] and r["contracts"].missing == []
    assert compare(fixture_items(BATCH), loaded, {})["da"].missing == ["DA1"]
    assert "1/1 matched" in r["da"].line("da") and "#5 measured 152/152" in r["da"].line("da")


def test_a_missing_value_on_either_side_is_not_a_difference():
    loaded = {"DA": {"2024Q2"}}
    batch = {"da": [{"code": "DA1", "state": "Oferta acceptata", "pub": "2024-05-01T00:00:00+03:00", "val": 0}]}
    assert compare(fixture_items(batch), loaded, {"DA1": ("DA", 500)})["da"].matched == 1


def run(day, status="ok", alert=None, id=None, steps=(), trigger="timer", kind="refresh"):
    return {"id": id or int(day.replace("-", "")), "kind": kind, "trigger": trigger, "started": f"{day}T03:00:00Z", "ended": f"{day}T03:20:00Z", "status": status, "alert": alert,
            "steps": [{"name": n, "status": s, "error": e, "warnings": w} for n, s, e, w in steps]}


DAYS = [f"2026-11-{d:02d}" for d in range(1, 8)]


def test_seven_days_with_a_run_each_and_no_alert_passes():
    ok, lines = week_report([run(d) for d in DAYS], date(2026, 11, 7))
    assert ok and lines[-1].endswith("YES") and lines[0].startswith("refresh runs, 2026-11-01 .. 2026-11-07")


def test_a_missing_day_an_alert_or_a_running_run_fails_it():
    ok, lines = week_report([run(d) for d in DAYS if d != "2026-11-04"], date(2026, 11, 7))
    assert not ok and "PROBLEM: 2026-11-04: no refresh run" in lines
    ok, lines = week_report([*[run(d) for d in DAYS[:-1]], run("2026-11-07", "failed", alert="deterministic failure: disk full")], date(2026, 11, 7))
    assert not ok and any("alerted: deterministic failure: disk full" in l for l in lines)
    assert not week_report([*[run(d) for d in DAYS[:-1]], run("2026-11-07", "running")], date(2026, 11, 7))[0]


def test_a_transient_failure_without_an_alert_is_a_note_unless_strict():
    runs = [*[run(d) for d in DAYS[:-1]], run("2026-11-07", "failed", steps=[("crawl", "failed", "timeout", [])])]
    ok, lines = week_report(runs, date(2026, 11, 7))
    assert ok and any(l.startswith("note: 2026-11-07: run #20261107 failed without an alert (crawl: timeout)") for l in lines)
    assert not week_report(runs, date(2026, 11, 7), strict=True)[0]


def test_runs_outside_the_window_seed_runs_and_step_warnings_are_handled():
    runs = [run("2026-10-30", "failed", alert="old"), *[run(d) for d in DAYS], run("2026-11-03", kind="seed", status="failed", id=5, alert="x"),
            run("2026-11-08", steps=[("load", "ok", None, ["2 units quarantined"])])]
    ok, lines = week_report(runs, date(2026, 11, 7))
    assert ok  # the old alert, the seed and the next day are not in the window
    ok, lines = week_report([*runs[1:8], run("2026-11-07", id=99, steps=[("load", "ok", None, ["2 units quarantined"])])], date(2026, 11, 7))
    assert ok and any("load warning: 2 units quarantined" in l for l in lines)


def test_check_week_reads_the_ledger_and_defaults_to_yesterday(tmp_path):
    ok, lines = check_week(tmp_path, through=date(2026, 11, 7))
    assert not ok and "never run" in lines[0]
    (tmp_path / LEDGER_NAME).write_text(json.dumps({"version": 1, "runs": [run(d) for d in DAYS]}))
    assert check_week(tmp_path, through=date(2026, 11, 7))[0]
    from datetime import datetime, timezone
    assert check_week(tmp_path, now=datetime(2026, 11, 8, 9, tzinfo=timezone.utc))[0]  # yesterday = 7 Nov
    (tmp_path / LEDGER_NAME).write_text("{broken")
    ok, lines = check_week(tmp_path, through=date(2026, 11, 7))
    assert not ok and "unreadable" in lines[0] and (tmp_path / LEDGER_NAME).read_text() == "{broken"  # read only: a corrupt ledger is left where it is


def test_the_cli_exit_code_follows_the_check(tmp_path, capsys, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    (tmp_path / LEDGER_NAME).write_text(json.dumps({"version": 1, "runs": [run(d) for d in DAYS]}))
    assert cli.main(["--archive", str(tmp_path), "check-week", "--through", "2026-11-07"]) == 0
    assert "YES" in capsys.readouterr().out
    assert cli.main(["--archive", str(tmp_path), "check-week", "--through", "2026-11-09"]) == 1
    assert cli.main(["--archive", str(tmp_path), "check-fixture"]) == 2  # no database
    assert cli.main(["--archive", str(tmp_path), "bench"]) == 2
    err = capsys.readouterr().err
    assert "--db or DATABASE_URL is required" in err


def test_the_shipped_batches_yield_items():
    from pipeline.acceptance import BATCH_DIR, DEFAULT_BATCHES

    for name in DEFAULT_BATCHES:
        batch = json.loads((BATCH_DIR / name).read_text(encoding="utf-8"))
        items = fixture_items(batch)
        kinds = {i.kind for i in items}
        assert kinds == {"da", "contracts"} and all(isinstance(i, Item) and i.quarter[:2] == "20" for i in items)
