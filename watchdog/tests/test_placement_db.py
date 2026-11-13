"""Placement through a real rebuild (ticket #67): the committed fixture `archive-placement/` and its `placement-data/` are rebuilt
into Postgres and `core.placement` is checked case by case. Needs Docker (the container fixture of test_bulk_loader_db.py)."""
import json
import shutil
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401  (the throwaway ParadeDB container and a database per test)
from test_placement import ANAF, CUI, DATA  # noqa: E402

ARCHIVE = Path(__file__).parent / "fixtures" / "archive-placement"


@pytest.fixture
def archive(tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(ARCHIVE, root)
    return Archive(root)


@pytest.fixture
def built(db, archive, tmp_path):
    summary = rebuild(archive, db, placement_dir=DATA, geo_dir=tmp_path / "geo")
    return db, summary


def placements(url):
    with psycopg.connect(url) as c:
        rows = c.execute("SELECT entity_key, county_iso, uat_siruta, village_siruta, sector, national, national_by, placed_by FROM core.placement ORDER BY 1").fetchall()
    return {r[0]: r[1:] for r in rows}


def test_authorities_are_placed_by_commune_village_town_municipality_and_sector(built):
    url, summary = built
    p = placements(url)
    assert p[CUI["sanpetru"]] == ("BV", "880010", "880011", None, False, "default", "ANAF")  # a village of the commune: stored
    assert p[CUI["brasov"]][:3] == ("BV", "880001", None)  # a municipality: no village
    assert p[CUI["rasnov"]][:3] == ("BV", "880030", None)  # Orş. Rîşnov against ORAŞ RÂŞNOV
    assert p[CUI["sinca"]][:2] == ("BV", "880060")  # comma-below against cedilla
    assert p[CUI["caragiale"]][:2] == ("CJ", "990010")  # I.L. against I. L.
    assert p[CUI["apahida"]][:2] == ("CJ", "990020")  # the typo alias
    assert p[CUI["bucharest3"]] == ("B", "179169", None, 3, False, "default", "ANAF")  # a Bucharest sector
    assert p["2000007"][:2] == ("BV", "880001")  # a supplier is placed too


def test_no_match_keeps_the_county_and_leaves_the_uat_empty(built):
    url, summary = built
    assert placements(url)[CUI["unmatched"]][:3] == ("BV", None, None)
    assert any(CUI["unmatched"] in line and "Necunoscuta".upper() in line.upper() for line in summary.placement.unmatched)


def test_seap_places_a_cui_anaf_misses_and_the_postal_code_picks_the_homonym(built):
    url, _ = built
    # `Sanpetru` is a commune and also a village of commune Ucea; Cod postal 507301 is that village's
    assert placements(url)[CUI["seap"]] == ("BV", "880050", "880052", None, False, "default", "SEAP")


def test_an_authority_with_neither_source_is_unplaced(built):
    url, summary = built
    assert CUI["unplaced"] not in placements(url)
    assert summary.placement.unplaced_authorities == 1


def test_national_authorities_come_from_the_award_notice_or_the_reviewed_file(built):
    url, summary = built
    p = placements(url)
    assert p[CUI["ministry"]][4:] == (True, "award-notice", "ANAF")  # legalBuyerType central
    assert p[CUI["agency"]][4:] == (True, "file", "ANAF")  # no award notice: the reviewed file
    assert p[CUI["dsp"]][:2] == ("BV", "880001") and p[CUI["dsp"]][4:] == (False, "award-notice", "ANAF")  # central but deconcentrated: its own county, no file line
    assert p[CUI["huedin"]][4:] == (False, "file-override", "ANAF")  # the notice wrongly says central: the file overrides it
    assert p[CUI["brasov"]][4:6] == (False, "award-notice")  # a local notice
    assert summary.placement.national == 2


def test_the_lines_say_what_was_placed(built):
    _, summary = built
    assert any(line.startswith("placement: ") for line in summary.lines())
    assert any(line.startswith("geo: ") for line in summary.lines())


def test_geography_tables_are_loaded(built):
    url, _ = built
    with psycopg.connect(url) as c:
        assert c.execute("SELECT count(*) FROM core.county").fetchone() == (42,)
        assert c.execute("SELECT count(*) FROM core.uat WHERE county_iso = 'B'").fetchone() == (6,)
        assert c.execute("SELECT name, point_source FROM core.uat WHERE siruta = '880010'").fetchone() == ("Sânpetru", "ancpi_pos")


def test_a_second_rebuild_gives_the_same_placements(built, archive, tmp_path):
    url, _ = built
    before = placements(url)
    rebuild(archive, url, placement_dir=DATA, geo_dir=tmp_path / "geo")
    assert placements(url) == before


def test_without_a_uat_table_only_the_county_is_placed(db, archive, tmp_path):
    empty = tmp_path / "data"
    empty.mkdir()
    shutil.copy(DATA / "counties.csv", empty / "counties.csv")
    summary = rebuild(archive, db, placement_dir=empty, geo_dir=tmp_path / "geo")
    p = placements(db)
    assert p[CUI["sanpetru"]][:3] == ("BV", None, None)
    assert "no UAT table" in summary.placement.line()
    assert "no UAT table" in summary.geo_line


def test_the_search_rows_carry_their_authority_s_county_and_uat(built):
    """The county/UAT search filter reads seap.search; a national authority is never counted in a county (#67)."""
    url, _ = built
    with psycopg.connect(url) as c:
        rows = c.execute("SELECT authority_key, authority_county, authority_uat, supplier_key, supplier_county FROM seap.search").fetchall()
    by_authority = {r[0]: (r[1], r[2]) for r in rows}
    assert by_authority[CUI["sanpetru"]] == ("RO-BV", "880010")
    assert by_authority[CUI["bucharest3"]] == ("RO-B", "179169")
    assert by_authority[CUI["unmatched"]] == ("RO-BV", None)  # county known, UAT not
    for key, (county, uat) in by_authority.items():
        p = placements(url).get(key)
        if p is None or p[4]:  # unplaced or national: NULL
            assert (county, uat) == (None, None), key
    suppliers = {r[3]: r[4] for r in rows if r[3]}
    assert suppliers.get("2000007") == "RO-BV"  # a placed supplier
    assert all(v is None or v.startswith("RO-") for v in suppliers.values())


def test_the_search_rows_carry_the_money_lens_areas(built):
    """authority_area is the county, NATIONAL or UNPLACED; supplier_area the county or UNKNOWN_SUPPLIER_COUNTY; never null (#71)."""
    url, _ = built
    with psycopg.connect(url) as c:
        rows = c.execute("SELECT authority_key, authority_area, supplier_key, supplier_area FROM seap.search").fetchall()
    area = {r[0]: r[1] for r in rows}
    assert area[CUI["sanpetru"]] == "RO-BV"
    assert area[CUI["bucharest3"]] == "RO-B"
    assert area[CUI["unmatched"]] == "RO-BV"  # county only
    assert area[CUI["ministry"]] == "NATIONAL" and area[CUI["agency"]] == "NATIONAL"  # seated in Bucharest, never RO-B
    assert area[CUI["unplaced"]] == "UNPLACED"
    assert {r[3] for r in rows if r[2] == "2000007"} == {"RO-BV"}


# The graph queries `authority-scope` and `seap-entities` used before they read the raw archive: the archive's answer must equal
# what these return on the graph rebuilt from the same archive.
_SCOPE_FROM_GRAPH = """
SELECT DISTINCT ON (authority_cui) authority_cui, ca_notice_id::text, notice_code FROM seap.record
 WHERE kind IN ('CONTRACT', 'AWARD_NOTICE') AND authority_key ~ '^[0-9]+$' AND authority_cui IS NOT NULL
   AND (ca_notice_id IS NOT NULL OR notice_code IS NOT NULL)
 ORDER BY authority_cui, (ca_notice_id IS NULL), published_on DESC, code"""
_UNKNOWN_TO_ANAF_FROM_GRAPH = """
SELECT DISTINCT r.authority_cui FROM seap.record r
 WHERE r.authority_key ~ '^[0-9]+$' AND r.authority_cui IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM core.anaf_company a WHERE a.cui = r.authority_key)
 ORDER BY 1"""


@pytest.mark.parametrize("fixture", ["archive-placement", "archive-signals", "archive-identity"])
def test_the_lookups_archive_candidates_match_the_graph_rebuilt_from_that_archive(db, tmp_path, fixture):
    from pipeline.placement import scope, seap_lookup

    shutil.copytree(Path(__file__).parent / "fixtures" / fixture, tmp_path / "a")
    archive = Archive(tmp_path / "a")
    from_archive = (scope.candidates(archive), seap_lookup.candidates(archive))  # before the rebuild: no graph needed
    rebuild(archive, db, placement_dir=DATA, geo_dir=tmp_path / "geo")
    with psycopg.connect(db) as c:
        graph_scope = [scope.Candidate(*row) for row in c.execute(_SCOPE_FROM_GRAPH).fetchall()]
        graph_unknown = [row[0] for row in c.execute(_UNKNOWN_TO_ANAF_FROM_GRAPH).fetchall()]
    # the graph loses a crawled Record's internal id when the bulk file has the same Record (the bulk version wins); the archive keeps it
    assert [(c.cui, c.notice_code) for c in from_archive[0]] == [(c.cui, c.notice_code) for c in graph_scope]
    assert {c.cui for c in from_archive[0]} == {c.cui for c in graph_scope}
    assert from_archive[1] == graph_unknown
