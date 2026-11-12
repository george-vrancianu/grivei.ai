"""The rollup the empty and chips-only search states read (ticket #70), through a real rebuild. Needs Docker (the container
fixture of test_bulk_loader_db.py)."""
import shutil
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)

FIXTURES = Path(__file__).parent / "fixtures"


def load(db_url, tmp_path, name="archive-search"):
    root = tmp_path / name
    if not root.exists():
        shutil.copytree(FIXTURES / name, root)
    rebuild(Archive(root), db_url)


def q(url, sql, *args):
    with psycopg.connect(url) as c:
        return c.execute(sql, args).fetchall()


@pytest.fixture
def built(db, tmp_path):
    load(db, tmp_path)
    return db


def test_the_cube_adds_up_to_the_scan_of_the_search_table(built):
    scan = q(built, "SELECT (count(*) FILTER (WHERE winner_position = 1))::int, coalesce(sum(share_bani), 0), (count(*) FILTER (WHERE winner_position = 1 AND value_bani IS NULL))::int FROM seap.search")
    cube = q(built, "SELECT coalesce(sum(records), 0)::int, coalesce(sum(awarded), 0), coalesce(sum(no_value), 0)::int FROM seap.rollup_cube")
    assert cube == scan and scan[0][0] == 13
    # one cell per chip combination: the 2022 Record is in its own year, the contracts in their own channel
    assert q(built, "SELECT award_year, channel, value_bucket, sum(records)::int FROM seap.rollup_cube WHERE award_year = 2022 GROUP BY 1, 2, 3") == [(2022, "DIRECT_PURCHASE", "UP_TO_135K", 1)]


def test_the_entity_rows_hold_each_entity_once_per_record_with_consortium_shares_summed(built):
    scan = q(built, "SELECT supplier_key, count(DISTINCT record_code)::int, sum(share_bani) FROM seap.search WHERE supplier_key IS NOT NULL GROUP BY 1 ORDER BY 1")
    rolled = q(built, "SELECT entity_key, sum(records)::int, sum(awarded) FROM seap.rollup_entity WHERE side = 'SUPPLIER' GROUP BY 1 ORDER BY 1")
    assert rolled == scan and len(scan) == 7  # a natural person has no key and no row
    assert q(built, "SELECT count(DISTINCT entity_key) FROM seap.rollup_entity WHERE side = 'AUTHORITY'") == [(4,)]


def test_the_prefixes_are_the_two_character_starts_of_the_folded_tokens(built):
    prefixes = {p for (p,) in q(built, "SELECT prefix FROM seap.rollup_prefix")}
    assert {"de", "sa", "45", "re", "10"} <= prefixes  # deszapezire, santier, a CPV code, reparatii, a CUI
    assert all(len(p) == 2 for p in prefixes) and "zz" not in prefixes and "io" not in prefixes  # a natural person is never in the text


def test_every_load_gets_a_fresh_generation_and_a_rollup_of_its_own_data(db, tmp_path):
    load(db, tmp_path)
    first = q(db, "SELECT generation FROM seap.rollup_meta")
    before = q(db, "SELECT sum(records)::int FROM seap.rollup_cube")
    assert len(first) == 1 and before == [(13,)]
    load(db, tmp_path, "archive-counting")  # a different archive into the same database
    second = q(db, "SELECT generation FROM seap.rollup_meta")
    assert len(second) == 1 and second != first
    assert q(db, "SELECT sum(records)::int FROM seap.rollup_cube") == q(db, "SELECT count(*)::int FROM seap.record") != before
