"""The keystroke benchmark and the validation-fixture check against a rebuilt fixture graph (#91). Needs Docker (the capped `pp37-pytest-<pid>`
ParadeDB container of test_bulk_loader_db.py, removed at the end); skipped without it. The fixture load is tiny: this proves the harness
runs every statement and reads the right tables, not that Postgres is fast."""
import json
import shutil
import time
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import bench  # noqa: E402
from pipeline.acceptance import check_fixture  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-search"

QUERIES = [
    {"label": "text", "filter": {"q": "servicii desz"}},
    {"label": "prefix", "filter": {"q": "ma"}},
    {"label": "supplier county", "filter": {"q": "servicii", "county": "RO-BV", "countySide": "SUPPLIER"}},
    {"label": "empty", "filter": {}},
    {"label": "chips", "filter": {"channel": "CONTRACT", "from": "2023-01-01", "to": "2023-12-31"}},
    {"label": "chips-scan", "filter": {"badges": ["NO_VALUE"]}},
]


@pytest.fixture
def built(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    rebuild(Archive(root), db)
    return db


def test_every_statement_of_every_state_runs_and_is_timed_on_a_rebuilt_graph(built):
    report = bench.run_sql(built, QUERIES, repetitions=2, threshold_ms=60_000)
    by = {q["label"]: q for q in report["queries"]}
    assert report["summary"]["failed"] == 0, report["summary"]
    assert report["host"]["cpus"] >= 1 and report["graph"]["searchRows"] == 16 and report["graph"]["pgSearch"]
    text = by["text"]
    assert set(text["statements"]) >= {"total", "map_totals", "map_entities", "entities_authority_cardinality", "entities_authority_rank", "entities_authority_stats",
                                       "entities_authority_entities", "entities_authority_placement", "entities_supplier_rank", "records_count", "records_page",
                                       "records_hydrate", "records_entities", "records_files", "go_to"}
    assert "map_supplier_totals" not in text["statements"]  # one side of the Money lens per request
    assert text["wall_ms"]["n"] == 2 and text["wall_ms"]["cold"] > 0 and text["tasks"]["records"]["median"] > 0
    assert by["empty"]["serving"] == {"total": "rollup", "map": "scan", "entities_authority": "mixed", "entities_supplier": "mixed", "records": "rollup", "data_through": "record"}
    assert by["chips"]["serving"]["records"] == "mixed" and "data_through" in by["text"]["statements"]
    assert "total" in by["empty"]["statements"] and "records_count" not in by["empty"]["statements"] and "records_page" in by["empty"]["statements"]
    assert by["supplier county"]["statements"]["map_totals"] is not None and "map_totals" in by["supplier county"]["statements"]
    assert by["empty"]["rollup_verified"] and by["chips"]["rollup_verified"]  # EXPLAIN of the exact statements timed: they read the rollup tables, never seap.search
    assert by["empty"]["rollup_checked"] == ["total", "entities_authority_rank", "entities_supplier_rank"]
    assert by["chips-scan"]["state"] == "chips-scan" and "rollup_verified" not in by["chips-scan"]
    json.dumps(report)


def test_the_explain_check_reads_the_statements_that_ran_and_fails_on_a_scan(built):
    with psycopg.connect(built) as conn:
        cold = bench.run_keystroke([conn] * 1, {}, rollup=True)
        assert bench.verify_rollup(conn, cold["sqls"], cold["mustReadRollup"])
        scan = bench.run_keystroke([conn], {}, rollup=False)  # the same state answered by the scan: nothing is rollup-served, and a scan statement named as one fails
        assert not bench.verify_rollup(conn, scan["sqls"], scan["mustReadRollup"])
        assert not bench.verify_rollup(conn, scan["sqls"], ["total"])


def test_the_scan_counters_read_the_three_tables_the_budget_names(built):
    with psycopg.connect(built) as conn:
        before = bench.scan_counts(conn)
        assert set(before) == set(bench.SCAN_TABLES) and all(isinstance(n, int) for n in before.values())


def test_the_scan_budget_of_a_real_chips_miss_is_calibrated_and_passes(built):
    """The counters count scan nodes, not statements (S-R2-1): the chips state's map + Top-K page cost more than 3 on the fixture, and the
    budget is what `calibrate_scans` measured, so the statements the API runs on a miss (map, rollup total/entities, the entity tabs' Signal counts, Top-K page) pass."""
    f = {"channel": "CONTRACT", "from": "2023-01-01", "to": "2023-12-31"}
    with psycopg.connect(built) as conn:
        allowed = bench.calibrate_scans(conn, f)
        before = bench.scan_counts(conn)
        bench.run_keystroke([conn], f, rollup=True)  # the miss: the same statements the API runs, all of them
        time.sleep(bench.STATS_LAG_S)
        judged = bench.judge_scans("chips", before, bench.scan_counts(conn), allowed, need_rollup=True)
    assert allowed >= 1 and judged["ok"], judged


def test_the_rollup_and_the_scan_agree_on_the_total_and_the_entity_ranking(built):
    """The statements the benchmark times are the API's: the same filter answered by the rollup and by the scan gives the same numbers."""
    f = {"channel": "CONTRACT", "from": "2023-01-01", "to": "2023-12-31"}
    with psycopg.connect(built) as conn:
        answers = {}
        for rollup in (True, False):
            rows = {}

            def timed(name, sql, params, rows=rows):
                got = conn.execute(sql, params).fetchall()
                rows[name] = got
                return got

            for t in bench.plan_tasks(f, rollup=rollup):
                if t.name in ("total", "entities_supplier"):
                    t.run(timed)
            answers[rollup] = rows
    assert answers[True]["total"] == answers[False]["total"]
    ranked = lambda r: [(row[0], row[1]) for row in r]  # noqa: E731
    assert ranked(answers[True]["entities_supplier_rank"]) == ranked(answers[False]["entities_supplier_rank"])


def test_a_threshold_nothing_can_meet_fails_every_query_and_the_cli_exits_1(built, tmp_path, capsys, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", built)
    from pipeline import cli

    out = tmp_path / "bench.json"
    code = cli.main(["--archive", str(tmp_path), "bench", "--repetitions", "1", "--threshold-ms", "0.001", "--only", "text", "--only", "empty", "--json", str(out)])
    assert code == 1
    report = json.loads(out.read_text())
    assert report["summary"]["failed"] == report["summary"]["total"] > 0
    assert "FAIL" in capsys.readouterr().out


def test_the_default_query_list_runs_on_the_fixture_graph(built):
    report = bench.run_sql(built, bench.load_queries(), repetitions=1, threshold_ms=60_000)
    assert report["summary"]["failed"] == 0 and report["summary"]["total"] == len(bench.load_queries())


def _batch_of(conn):
    """A crawl batch shaped like the harvest's, made from the loaded graph itself (the DA and CONTRACT Records of the fixture)."""
    da = conn.execute("SELECT code, value_bani, published_on FROM seap.record WHERE kind = 'DA' ORDER BY code").fetchall()
    contracts = conn.execute("SELECT code, value_bani, published_on, notice_code, contract_numbers FROM seap.record WHERE kind = 'CONTRACT' ORDER BY code").fetchall()
    assert da and contracts
    return {
        "authority": {"name": "FIXTURE", "cui": "4384206"},
        "da": [{"code": c, "state": "Oferta acceptata", "pub": f"{d}T10:00:00+03:00", "val": (v / 100 if v is not None else None)} for c, v, d in da],
        "notices": [{"noticeNo": n, "procedureId": 1, "date": f"{d}T10:00:00+03:00"} for c, v, d, n, nums in contracts],
        "contracts": [{"noticeNo": n, "contractNo": nums[0], "date": f"{d}T00:00:00+03:00", "valueRon": (v / 100) if v is not None else None}
                      for c, v, d, n, nums in contracts],
    }


def test_the_validation_fixture_agrees_with_the_graph_it_was_made_from_and_fails_on_a_miss(built, tmp_path, capsys, monkeypatch):
    """The scope is switched off (quarter and authority `None`): the fixture graph is not Brasov 2026Q3."""
    everything = dict(quarter=None, authority=None)
    with psycopg.connect(built) as conn:
        good = _batch_of(conn)
    assert good["da"] and good["contracts"]
    path = tmp_path / "batch.json"
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path], **everything)
    assert ok, lines
    assert any(l.startswith("da (crawl -> graph): ") and f"{len(good['da'])}/{len(good['da'])} matched" in l for l in lines)
    assert any(l.startswith("contracts (bulk -> crawl): ") and f"{len(good['contracts'])}/{len(good['contracts'])} of the graph's bulk contracts" in l for l in lines)
    assert any(l.startswith("also (wider") for l in lines)
    # one DA the graph does not have: 0 misses allowed
    good["da"].append({"code": "DA00000001", "state": "Oferta acceptata", "pub": good["da"][0]["pub"], "val": 1})
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path], **everything)
    assert not ok and "missing: DA00000001" in "\n".join(lines) and "FAILED" in lines[-1]
    assert check_fixture(built, [path], allow_missing_da=1, **everything)[0]
    good["da"].pop()
    # a DA with another value is not a match either
    good["da"][0]["val"] += 1
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path], **everything)
    assert not ok and any("different:" in l for l in lines)
    good["da"][0]["val"] -= 1
    # one bulk contract the crawl batch lacks: 1 allowed by default (#5: 45/46), 0 when asked
    lacked = good["contracts"].pop()
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path], **everything)
    assert ok and any(f"{len(good['contracts'])}/{len(good['contracts']) + 1} of the graph's bulk contracts" in l and "1 missing" in l for l in lines)
    assert any(f"not in the crawl: {lacked['noticeNo']}~{lacked['contractNo']}" in l for l in lines)
    assert not check_fixture(built, [path], allow_missing_contracts=0, **everything)[0]
    # the scope: another authority's batch is not the one of #5; a quarter the graph holds no bulk file for compares nothing
    ok, lines = check_fixture(built, [path], quarter=None, authority="1")
    assert not ok and "no batch is of authority 1" in "\n".join(lines)
    ok, lines = check_fixture(built, [path], quarter="2031Q1", authority=None)
    assert not ok and any("nothing to compare" in l for l in lines)
    monkeypatch.setenv("DATABASE_URL", built)
    from pipeline import cli

    assert cli.main(["--archive", str(tmp_path), "check-fixture", "--batch", str(path), "--quarter", "all", "--authority", "all", "--allow-missing-contracts", "0"]) == 1
    assert "not in the crawl:" in capsys.readouterr().out
