"""ONRC's search table, Coverage cells and latency benchmark through a real rebuild (ticket #176): `archive-onrc-search/` (the ONRC world plus three sole traders with
valid CUIs) is rebuilt into Postgres. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it. The fixture load is tiny: the benchmark here
proves the harness runs every statement of ONRC's keystroke and that the path is far under the 500 ms target, not that the national register is fast (#187)."""
import json
import shutil
import sys
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

sys.path.insert(0, str(Path(__file__).parent / "fixtures"))
from build_onrc_archive import ALFA, AUTH, BETA, DELTA, DUBLA, GAMMA, INVALID, OMEGA, PFA, S1, S2, S4, SOLO_FORM, SOLO_II, SOLO_PFA, ZETA  # noqa: E402
from pipeline import bench_onrc  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-onrc-search"
SOLE_TRADERS = (PFA, SOLO_PFA, SOLO_II, SOLO_FORM)


@pytest.fixture
def built(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    summary = rebuild(Archive(root), db)
    return db, summary, root


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def test_every_registration_is_searchable_except_a_sole_traders(built):
    url, summary, _ = built
    assert q(url, "SELECT count(*) FROM onrc.registration") == [(13,)]
    assert q(url, "SELECT count(*), count(DISTINCT reg_no) FROM onrc.search") == [(9, 9)]
    assert summary.onrc_search.indexed == 9 and summary.onrc_search.sole_traders_left_out == 4
    assert "4 sole traders" in "\n".join(summary.lines())
    assert q(url, "SELECT reg_no FROM onrc.registration EXCEPT SELECT reg_no FROM onrc.search ORDER BY 1") == sorted((c[2],) for c in SOLE_TRADERS)
    # no part of the document, the CUI column or the registration number holds a sole trader's name, CUI or number
    for name, cui, reg_no in SOLE_TRADERS:
        words = [w.lower() for w in name.replace(".", "").split() if len(w) > 3 and w not in ("ALFA", "PERSOANA", "FIZICA", "AUTORIZATA")]
        for word in words:
            assert q(url, "SELECT count(*) FROM onrc.search WHERE doc ~ %s", f"(^| ){word}( |$)") == [(0,)], word
        assert q(url, "SELECT count(*) FROM onrc.search WHERE cui = %s OR reg_no = %s", str(cui), reg_no) == [(0,)]


def test_the_document_holds_the_name_the_aliases_the_cui_the_registration_number_and_the_caen_codes(built):
    url, _, _ = built
    assert q(url, "SELECT doc FROM onrc.search WHERE reg_no = %s", ALFA[2]) == [(f"alfa onrc {ALFA[1]} j40 1001 2015 4120 4211",)]
    assert q(url, "SELECT doc FROM onrc.search WHERE reg_no = %s", BETA[2]) == [(f"beta nou beta vechi {BETA[1]} j40 1002 2012 4321",)]  # the current name, then an earlier one
    # an earlier name that looks like a sole trader's is in neither the document nor the aliases the API highlights from
    assert q(url, "SELECT doc, aliases FROM onrc.search WHERE reg_no = %s", OMEGA[2]) == [(f"omega only {OMEGA[1]} j12 1007 2020 6201", [])]
    assert q(url, "SELECT aliases FROM onrc.search WHERE reg_no = %s", BETA[2]) == [(["BETA VECHI SRL"],)]
    assert q(url, "SELECT doc FROM onrc.search WHERE reg_no = %s", INVALID[2]) == [("firma cui gresit j40 1010 2017",)]  # no valid CUI, still an organisation


def test_the_filter_columns(built):
    url, _, _ = built
    row = lambda reg: q(url, "SELECT cui, area, statuses, caen, seap_counterparty, registration_date::text FROM onrc.search WHERE reg_no = %s", reg)[0]  # noqa: E731
    assert row(ALFA[2]) == (str(ALFA[1]), "RO-CJ", ["1048", "1107"], ["4120", "4211"], True, "2015-03-10")
    assert row(GAMMA[2])[1:3] == ("RO-CJ", ["1084"])  # struck off
    assert row(DELTA[2])[1] == "RO-BV" and row(BETA[2])[1] == "RO-B" and row(DUBLA[2])[1] == "RO-IS"
    assert row(ZETA[2])[1] == "UNPLACED" and row(ZETA[2])[2] == ["1048", "2110"]  # no county: the Unplaced tile
    assert [row(c[2])[4] for c in (AUTH, ALFA, BETA, GAMMA, DELTA, DUBLA)] == [True] * 6  # an authority and the winners of the SEAP slice
    assert [row(c[2])[4] for c in (OMEGA, ZETA, INVALID)] == [False] * 3


def test_the_bm25_index_is_there_and_answers(built):
    url, _, _ = built
    assert q(url, "SELECT indexdef LIKE %s FROM pg_indexes WHERE schemaname = 'onrc' AND indexname = 'search_bm25'", "%USING paradedb%") == [(True,)]
    assert q(url, "SELECT reg_no FROM onrc.search WHERE doc @@@ pdb.regex('alf.*') ORDER BY reg_no") == [(ALFA[2],)]


def test_the_coverage_cells_are_one_per_snapshot_and_one_per_missing_month(built, db, tmp_path):
    url, summary, root = built
    assert q(url, "SELECT period, kind, state, records, data_through::text FROM onrc.coverage_cell ORDER BY period_start") == [
        ("2025-03-18", "REGISTRATION", "LOADED", 7, "2025-03-18"), ("2026-03-02", "REGISTRATION", "LOADED", 13, "2026-03-02"),
        ("2026-04-03", "REGISTRATION", "LOADED", 13, "2026-04-03"), ("2026-05-06", "REGISTRATION", "LOADED", 13, "2026-05-06")]
    assert summary.onrc.coverage_cells == 4
    # without April's snapshot: April is a known gap with its month as the period
    shutil.rmtree(root / "onrc" / "snapshot" / "firme" / "2026-04-03")
    gap_db = f"{db}x"
    with psycopg.connect(db.rsplit("/", 1)[0] + "/postgres", autocommit=True) as c:
        c.execute(f"CREATE DATABASE {gap_db.rsplit('/', 1)[1]}")
    rebuild(Archive(root), gap_db)
    assert q(gap_db, "SELECT period, state, records, data_through::text, period_start::text, period_end::text FROM onrc.coverage_cell ORDER BY period_start") == [
        ("2025-03-18", "LOADED", 7, "2025-03-18", "2025-03-18", "2025-03-18"), (S2, "LOADED", 13, S2, S2, S2), ("2026-04", "KNOWN_GAP", 0, None, "2026-04-01", "2026-04-30"), (S4, "LOADED", 13, S4, S4, S4)]


def test_the_latency_benchmark_runs_every_statement_and_is_far_under_the_target(built):
    url, _, _ = built
    report = bench_onrc.run_sql(url, bench_onrc.load_queries(), repetitions=2, threshold_ms=500)
    assert report["summary"]["failed"] == 0, [q for q in report["queries"] if not q["pass"]]
    assert report["registrations"] == 9
    by = {q["label"]: q for q in report["queries"]}
    assert set(by["alfa onrc (multi-token, prefix)"]["statements"]) >= {"count", "map", "organisations_count", "organisations_page", "organisations_rows", "organisations_statuses", "organisations_caen", "organisations_aliases", "organisations_entities"}
    assert all(q["wall_ms"]["p95"] < 500 for q in report["queries"])
    json.dumps(report, default=str)
    assert "17/17 passed" in bench_onrc.render_table(report)
