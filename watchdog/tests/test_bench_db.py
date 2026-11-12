"""The keystroke benchmark and the validation-fixture check against a rebuilt fixture graph (#91). Needs Docker (the capped `pp37-pytest-<pid>`
ParadeDB container of test_bulk_loader_db.py, removed at the end); skipped without it. The fixture load is tiny: this proves the harness
runs every statement and reads the right tables, not that Postgres is fast."""
import json
import shutil
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
    assert set(text["statements"]) >= {"total", "map_authority_totals", "map_authority_entities", "map_supplier_totals", "entities_authority_cardinality", "entities_authority_rank",
                                       "entities_authority_stats", "entities_supplier_rank", "records_count", "records_page", "records_hydrate"}
    assert text["wall_ms"]["n"] == 2 and text["wall_ms"]["cold"] > 0 and text["tasks"]["records"]["median"] > 0
    assert by["empty"]["serving"] == {"total": "rollup", "map_authority": "scan", "map_supplier": "scan", "entities_authority": "rollup", "entities_supplier": "rollup", "records": "rollup"}
    assert "total" in by["empty"]["statements"] and "records_count" not in by["empty"]["statements"]
    assert by["empty"]["rollup_verified"] and by["chips"]["rollup_verified"]  # EXPLAIN reads the rollup tables, never seap.search
    assert by["chips-scan"]["state"] == "chips-scan" and "rollup_verified" not in by["chips-scan"]
    json.dumps(report)


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
        "authority": {"name": "FIXTURE"},
        "da": [{"code": c, "state": "Oferta acceptata", "pub": f"{d}T10:00:00+03:00", "val": (v / 100 if v is not None else None)} for c, v, d in da],
        "notices": [{"noticeNo": n, "procedureId": 1, "date": f"{d}T10:00:00+03:00"} for c, v, d, n, nums in contracts],
        "contracts": [{"noticeNo": n, "contractNo": nums[0], "date": f"{d}T00:00:00+03:00", "valueRon": (v / 100) if v is not None else None}
                      for c, v, d, n, nums in contracts],
    }


def test_the_validation_fixture_agrees_with_the_graph_it_was_made_from_and_fails_on_a_miss(built, tmp_path, capsys, monkeypatch):
    with psycopg.connect(built) as conn:
        good = _batch_of(conn)
    assert good["da"] and good["contracts"]
    path = tmp_path / "batch.json"
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path])
    assert ok, lines
    assert any(l.startswith("da: ") and f"{len(good['da'])}/{len(good['da'])} matched" in l for l in lines)
    # one DA the graph does not have: 0 misses allowed
    good["da"].append({"code": "DA00000001", "state": "Oferta acceptata", "pub": good["da"][0]["pub"], "val": 1})
    path.write_text(json.dumps(good))
    ok, lines = check_fixture(built, [path])
    assert not ok and "missing: DA00000001" in "\n".join(lines) and "FAILED" in lines[-1]
    assert check_fixture(built, [path], allow_missing_da=1)[0]
    # one contract with a different value: 1 allowed by default (#5: 45/46), 0 when asked
    good["da"].pop()
    good["contracts"][0]["valueRon"] += 1
    path.write_text(json.dumps(good))
    assert check_fixture(built, [path])[0] and not check_fixture(built, [path], allow_missing_contracts=0)[0]
    monkeypatch.setenv("DATABASE_URL", built)
    from pipeline import cli

    assert cli.main(["--archive", str(tmp_path), "check-fixture", "--batch", str(path), "--allow-missing-contracts", "0"]) == 1
    assert "different:" in capsys.readouterr().out
    # a batch of quarters the graph has no bulk file for compares nothing: that is a failure, not a pass
    far = {"da": [{"code": "DA1", "state": "Oferta acceptata", "pub": "2031-01-01T00:00:00+02:00", "val": 1}], "notices": [], "contracts": []}
    path.write_text(json.dumps(far))
    ok, lines = check_fixture(built, [path])
    assert not ok and any("nothing to compare" in l for l in lines)
