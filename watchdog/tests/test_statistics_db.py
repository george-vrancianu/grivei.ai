"""The planner-statistics rule (ticket #287, spec #285): every table a later rebuild step reads has `pg_stats` rows once the rebuild is done.
Through `pipeline rebuild` and the graph only; the temp tables (onrc_counterparty, party, spelling, seap.search_load) are gone after the commit, so this test cannot observe them:
their ANALYZE is covered by code review only. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.onrc.people import SECRET_ENV  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import READ_BY_LATER_STEPS, db, server, tables_without_statistics  # noqa: E402,F401

FIXTURES = Path(__file__).parent / "fixtures"
# which fixture archives make which tables non-empty (an empty table is not checked)
WORLDS = {
    "onrc-signals": (["archive-onrc-signals"], {"core.entity", "core.anaf_company", "onrc.registration", "onrc.status_span", "onrc.name_span", "onrc.caen", "seap.record", "seap.search", "seap.signal", "seap.source_file", "seap.rollup_prefix", "onrc.snapshot", "financials.source_file", "financials.statement", "build.step"}),
    "onrc-search": (["archive-onrc-search"], {"onrc.status_span", "onrc.name_span", "onrc.status_name", "seap.record"}),
    "placement-mf-aep": (["archive-placement", "archive-mf", "archive-aep"], {"core.county", "core.uat", "core.placement", "aep.subordinate", "core.mf_principal", "aep.mandate", "aep.authority", "aep.record_party"}),
    "onrc-people": (["archive-onrc-people"], {"onrc.role"}),
    "crawl": (["archive-crawl"], {"seap.crawl_state"}),
    "donations": (["archive-banipartide"], {"donations.donation"}),
    "amepip": (["archive-amepip"], {"amepip.enterprise"}),
}


@pytest.mark.parametrize("world", WORLDS)
def test_every_table_a_later_step_reads_has_statistics(db, tmp_path, world, monkeypatch):
    monkeypatch.setenv(SECRET_ENV, "dummy-secret-for-tests-only-0123456789")  # the ONRC people files need the person-id secret
    names, expected_filled = WORLDS[world]
    root = tmp_path / "archive"
    for name in names:
        shutil.copytree(FIXTURES / name, root, dirs_exist_ok=True)
    data = tmp_path / "data"
    shutil.copytree(FIXTURES / "placement-data", data)
    rebuild(Archive(root), db, placement_dir=data, geo_dir=tmp_path / "geo", known_gaps_path=FIXTURES / "mf-known-gaps.csv",
            overrides_path=FIXTURES / "identity-overrides.toml", today=date(2026, 11, 20))
    with psycopg.connect(db) as c:  # the check must not pass by every table being empty
        filled = {t for t in READ_BY_LATER_STEPS if c.execute(f"SELECT EXISTS (SELECT 1 FROM {t})").fetchone()[0]}
    assert expected_filled <= filled
    assert tables_without_statistics(db) == []


def test_the_worlds_cover_every_listed_table():
    """A table added to READ_BY_LATER_STEPS must be filled by some world, or its check is vacuous (an empty table is skipped)."""
    assert set(READ_BY_LATER_STEPS) <= set().union(*(filled for _, filled in WORLDS.values()))
