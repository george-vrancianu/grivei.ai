"""A refresh whose load step meets a file that fails validation (#81): the run succeeds with a warning, the file sits in quarantine, and the
public Coverage grid shows the quarter as "not yet loaded" without a reason. Needs Docker (fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.progress import Progress, read_status  # noqa: E402
from pipeline.refresh import Ledger, Pinger, StepResult, run_refresh  # noqa: E402
from pipeline.refresh.status import quarantine_lines  # noqa: E402
from pipeline.refresh.steps import Impl  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401
from test_refresh import Clock, Pings  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


def test_a_quarantined_file_is_a_warning_in_the_run_and_not_yet_loaded_in_the_public_grid(db, tmp_path):
    shutil.copytree(FIXTURES / "archive-coverage", tmp_path / "archive")
    archive, clock, pings = Archive(tmp_path / "archive"), Clock(), Pings()
    status_file = tmp_path / "rebuild-status.json"
    load = lambda: rebuild(archive, db, Progress(status_file), today=date(2025, 9, 20), known_gaps_path=FIXTURES / "coverage-known-gaps.csv")
    impl = Impl(archive, print, None, None, None, None, load)
    impl.crawl = impl.datagov = impl.anaf = lambda: StepResult()  # the network steps are not under test here

    result = run_refresh(archive, impl, pinger=Pinger("https://hc.example/p", post=pings), now=clock.now, sleep=clock.sleep, say=lambda _: None)

    assert result.status == "ok"  # suspicious success: loaded, warned
    assert pings.urls == ["https://hc.example/p"] and "quarantined (not loaded" in pings.calls[0][1]
    # the same read the Coverage grid's own Seam-1 test (test_coverage_db.py) makes of the persisted grid
    with psycopg.connect(db) as c:
        cell = c.execute("SELECT state, rule, note, records, data_through FROM seap.coverage_cell WHERE quarter = '2022-Q2' AND kind = 'DA'").fetchone()
    assert cell == ("NOT_YET_LOADED", None, None, 0, None)  # public: not yet loaded, no reason, no through-date
    assert read_status(status_file)["dataThrough"]["DA"] == "2022-03-31"  # the kind's public data-through stays at the last loaded quarter (Q1), not moved by the quarantined Q2
    assert any("quarantine: 1 open" in line for line in quarantine_lines(archive))
    assert Ledger(archive.root / "refresh-ledger.json").runs[-1]["steps"][-1]["counts"]["quarantined"] == 1

    again = run_refresh(archive, impl, pinger=Pinger(None), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert [s["name"] for s in again.run["steps"]] == []  # the quarantine moved a unit, but the load that moved it recorded the new state
