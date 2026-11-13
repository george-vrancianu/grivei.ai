"""The Coverage grid through a real rebuild (ticket #79): the committed fixture `archive-coverage/` (see its generator) is rebuilt into
Postgres with the day fixed to 2025-09-20 and the fixture's known-gaps file; every cell state is checked. Needs Docker (the container
fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401

FIXTURES = Path(__file__).parent / "fixtures"
TODAY = date(2025, 9, 20)
GAPS = FIXTURES / "coverage-known-gaps.csv"
D = date.fromisoformat


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-coverage", root)
    return Archive(root)


def grid(url):
    with psycopg.connect(url) as c:
        rows = c.execute("SELECT quarter, kind, state, rule, note, records, data_through FROM seap.coverage_cell ORDER BY quarter, kind").fetchall()
    return {(q, k): (state, rule, note, records, through) for q, k, state, rule, note, records, through in rows}


def test_every_cell_state_comes_out_of_the_fixture_archive(db, archive):
    summary = rebuild(archive, db, today=TODAY, known_gaps_path=GAPS)
    g = grid(db)
    assert len(g) == 19 * 4  # 2021 Q1 .. 2025 Q3

    assert g["2022-Q1", "DA"] == ("LOADED", None, None, 3, D("2022-03-31"))  # bulk
    assert g["2021-Q2", "AWARD_NOTICE"] == ("LOADED", None, None, 2, D("2021-05-06"))  # covered by the backfill's pass 1
    assert g["2025-Q2", "DAN"][:3] == ("KNOWN_GAP", "HAND_ENTERED", "Fișier încărcat greșit (fixture), conținutul nu corespunde trimestrului; raportat la sursă, trimestrul rămâne gol")
    assert g["2024-Q4", "CONTRACT"] == ("POSSIBLY_INCOMPLETE", "COUNT_BELOW_NEIGHBOURS", None, 9, D("2024-11-09"))
    assert g["2021-Q1", "AWARD_NOTICE"] == ("NOT_IN_SOURCE", "NO_PRIOR_CALL_BEFORE_BACKFILL", None, 0, None)
    assert g["2025-Q3", "CONTRACT"] == ("CRAWLED_PROVISIONAL", "AWAITING_BULK_FILE", None, 3, D("2025-07-02"))
    assert g["2025-Q3", "AWARD_NOTICE"] == ("CRAWLED_PROVISIONAL", "AWAITING_BULK_FILE", None, 2, D("2025-07-02"))
    assert g["2022-Q2", "DA"] == ("NOT_YET_LOADED", None, None, 0, None)  # the quarantined file
    assert g["2025-Q3", "DA"] == ("NOT_YET_LOADED", "AWAITING_BULK_FILE", None, 0, None)
    assert g["2025-Q3", "DAN"][:2] == ("NOT_YET_LOADED", "AWAITING_BULK_FILE")

    # the neighbours of the undersized quarter are fine; a crawl-only Record counts in its loaded quarter (15 file rows + 1)
    assert [g[q, "CONTRACT"][0] for q in ("2024-Q2", "2024-Q3", "2025-Q1", "2025-Q2")] == ["LOADED"] * 4
    assert g["2025-Q2", "CONTRACT"][3] == 16
    with psycopg.connect(db) as c:  # the crawl-only count the Coverage page lists (#60/#90): the crawled day's contract the bulk lacks
        rows = c.execute("SELECT quarter, kind, crawl_only FROM seap.coverage_cell WHERE crawl_only > 0").fetchall()
    assert ("2025-Q2", "CONTRACT", 1) in rows
    assert g["2021-Q3", "AWARD_NOTICE"][:2] == ("NOT_IN_SOURCE", "NO_PRIOR_CALL_BEFORE_BACKFILL")  # one week only: not covered
    assert g["2021-Q3", "AWARD_NOTICE"][3] == 1

    assert {s for s, *_ in g.values()} == {"LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"}
    assert "coverage: 2024-Q4 CONTRACT possibly incomplete (fewer than 60% of the median of its neighbouring quarters), 9 records" in summary.coverage
    assert "coverage: 2022-Q2 DA not yet loaded" in summary.coverage
    # the quarantine's reason is not in the grid at all
    assert "header" not in repr(g).lower()


def test_a_second_rebuild_gives_the_same_grid_and_the_default_known_gaps_file_is_used_without_the_flag(db, archive):
    rebuild(archive, db, today=TODAY, known_gaps_path=GAPS)
    first = grid(db)
    assert archive.quarantined()  # the DA 2022 Q2 unit is now in the quarantine area ...
    rebuild(archive, db, today=TODAY, known_gaps_path=GAPS)  # ... and is not read again, yet its cell stays NOT_YET_LOADED
    assert grid(db) == first
    rebuild(archive, db, today=TODAY)  # the checked-in file: Q2 2025 DAN with the operator's own note
    assert grid(db)["2025-Q2", "DAN"][:2] == ("KNOWN_GAP", "HAND_ENTERED")
    assert grid(db)["2025-Q2", "DAN"][2] != first["2025-Q2", "DAN"][2]


def test_a_loaded_quarter_stays_loaded_when_a_later_refetch_is_quarantined(db, archive):
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q1", fetched_at=datetime(2022, 8, 1, tzinfo=timezone.utc),
                       files={"x.csv": b"A,B\n1,2\n"}, via="Achizitii directe 2022 - T1")  # a re-fetch with headers nobody knows
    rebuild(archive, db, today=TODAY, known_gaps_path=GAPS)
    assert grid(db)["2022-Q1", "DA"][0] == "LOADED"
