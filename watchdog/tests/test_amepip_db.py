"""AMEPIP's public-enterprise list through a real rebuild (ticket #183): `archive-amepip/` (the list) on top of `archive-identity/` (SEAP Records
and archived ANAF answers, so entities with CUIs) is rebuilt into Postgres. An entity whose key is on the list is a public enterprise with its
basis (the list's row and snapshot); the others are not. Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
from datetime import date
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    shutil.copytree(FIXTURES / "archive-amepip", root, dirs_exist_ok=True)
    return Archive(root)


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


def test_matching_entities_are_flagged_with_their_basis_and_the_others_are_not(db, archive):
    summary = rebuild(archive, db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert summary.amepip is not None and (summary.amepip.snapshot, summary.amepip.enterprises, summary.amepip.matched) == (date(2026, 1, 13), 4, 2)
    assert "amepip list: snapshot 2026-01-13, 4 public enterprises, 2 of them entities of the graph" in summary.lines()
    flagged = q(db, "SELECT e.key, a.name, a.registration_number, a.status, a.first_year, a.last_year, a.snapshot_date FROM core.entity e JOIN amepip.enterprise a ON a.cui = e.key")
    assert sorted(flagged) == [("2000007", "ALFA DEMO SRL", "J40/1/2005", "funcţiune", 2022, 2023, date(2026, 1, 13)),
                               ("2000031", "CNAIR DEMO S.A.", "J40/2/2005", "este sub incidenţa Legii nr. 85/2014, insolvenţă", 2023, 2023, date(2026, 1, 13))]
    [(entities,)] = q(db, "SELECT count(*) FROM core.entity")
    assert entities > 1  # the other entities of the fixture are there and carry no flag
    [snapshot] = q(db, "SELECT snapshot_date, archive_path, via, license, enterprises FROM amepip.snapshot")
    assert snapshot == (date(2026, 1, 13), "amepip/list/enterprises/2026-01-13/2026-11-14/datecompanii_ind-finnefin.xlsx", "Date financiare si non-financiare", "CC-BY-4.0", 4)
    assert q(db, "SELECT dataset_url FROM amepip.snapshot") == [("https://data.gov.ro/dataset/amepip-indicatori-financiari-demo",)]


def test_a_rebuild_without_a_list_flags_nobody_and_says_so(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURES / "archive-identity", root)
    summary = rebuild(Archive(root), db, overrides_path=FIXTURES / "identity-overrides.toml")
    assert summary.amepip.snapshot is None and "amepip list: none archived" in summary.amepip.line()
    assert q(db, "SELECT count(*) FROM amepip.enterprise") == [(0,)]
