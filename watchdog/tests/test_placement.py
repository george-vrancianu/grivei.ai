"""Placement without a database (ticket #67): the matching rules one by one, the UAT table generator, the TopoJSON, the geography
fetch (seam 2, HTTP stubbed) and the two SEAP lookups (seam 2). The Postgres side is test_placement_db.py."""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
sys.path.insert(0, str(FIXTURES))

from build_placement_archive import ANAF, CUI, DATA, OUT as ARCHIVE_DIR, ancpi_pages, siruta_csv, wikidata_json  # noqa: E402,F401
from pipeline.archive import Archive  # noqa: E402
from pipeline.geo import fetch as geo_fetch_mod  # noqa: E402
from pipeline.geo.table import TableError, build_tables  # noqa: E402
from pipeline.geo.topo import build_topojson  # noqa: E402
from pipeline.placement import scope, seap_lookup  # noqa: E402
from pipeline.placement.lookup import LookupClient  # noqa: E402
from pipeline.placement.matching import (  # noqa: E402
    Locality, ascii_fold, bare_uat_name, display_name, fold, parse_anaf_locality, place_by_anaf, place_by_seap, postal_code_of)
from pipeline.placement.tables import load_gazetteer  # noqa: E402

GAZ, HAS_UATS = load_gazetteer(DATA)


@pytest.fixture
def archive(tmp_path):
    shutil.copytree(ARCHIVE_DIR, tmp_path / "archive")
    return Archive(tmp_path / "archive")


# ---- folding ---------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("spellings", [
    ("ŞINCA NOUĂ", "Șinca Nouă", "SINCA NOUA", "sinca-noua"),  # cedilla, comma-below, ASCII, hyphen
    ("ȚARA", "ŢARA", "Tara", "TARA"),
    ("RÂŞNOV", "Rîşnov", "RISNOV"),  # Â and Î both fold to I
    ("I.L. Caragiale", "I. L. CARAGIALE", "IL CARAGIALE", "i l caragiale"),  # dots and the spaces around initials
    ("Cluj-Napoca", "CLUJ NAPOCA", "cluj.napoca"),
])
def test_fold_makes_the_spellings_one_key(spellings):
    assert len({fold(s) for s in spellings}) == 1


def test_fold_keeps_different_names_apart_and_does_not_glue_words():
    assert fold("Sânpetru") != fold("Sânpetru Mare")
    assert fold("Valea Mare") == "VALEA MARE" and fold("A B Caragiale") == "AB CARAGIALE"


def test_ascii_fold_keeps_a_circumflex_a_as_a_because_seaps_list_is_ascii():
    assert ascii_fold("Râşnov") == "RASNOV" and ascii_fold("Rîşnov") == "RISNOV" and fold("Râşnov") == "RISNOV"


@pytest.mark.parametrize("name, bare", [("MUNICIPIUL ALBA IULIA", "ALBA IULIA"), ("ORAŞ AIUD", "AIUD"), ("COMUNA", "COMUNA"), ("ŞINCA NOUĂ", "SINCA NOUA")])
def test_siruta_kind_words_are_stripped(name, bare):
    assert bare_uat_name(name) == bare


def test_display_names_are_comma_below_title_case_without_kind_words():
    assert display_name("MUNICIPIUL TÂRGU MUREŞ") == "Târgu Mureș"
    assert display_name("ORAŞ ŢĂNDĂREI") == "Țăndărei"
    assert display_name("AIUDUL DE SUS") == "Aiudul de Sus"
    assert display_name("CLUJ-NAPOCA") == "Cluj-Napoca"


# ---- ANAF's locality string ------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("text, expected", [
    ("Sat Sânpetru Com. Sânpetru", Locality(uat="SINPETRU", kind="COM", village="SINPETRU")),
    ("Com. Exemplu", Locality(uat="EXEMPLU", kind="COM")),
    ("Mun. Braşov", Locality(uat="BRASOV", kind="MUN")),
    ("Orş. Tăşnad", Locality(uat="TASNAD", kind="ORS")),
    ("Loc. Sântandrei Mun. Oradea", Locality(uat="ORADEA", kind="MUN", village="SINTANDREI")),
    ("Sat I.L. Caragiale Com. I. L. Caragiale", Locality(uat="IL CARAGIALE", kind="COM", village="IL CARAGIALE")),
    ("Sector 5 Mun. Bucureşti", Locality(uat="BUCURESTI", kind="MUN", sector=5)),
    ("  Mun.   Cluj-Napoca ", Locality(uat="CLUJ NAPOCA", kind="MUN")),
])
def test_parse_anaf_locality(text, expected):
    assert parse_anaf_locality(text) == expected


@pytest.mark.parametrize("text", [None, "", "   ", "Braşov", "Strada Exemplu"])
def test_a_locality_without_a_kind_word_is_not_guessed(text):
    assert parse_anaf_locality(text) is None


# ---- the gazetteer: ANAF -------------------------------------------------------------------------------------------------

def anaf(locality, county="BV", jud="8", postal=None):
    return place_by_anaf(GAZ, county_auto=county, county_jud=jud, locality=locality, postal=postal)


def test_the_county_comes_from_the_iso_code_else_from_sirutas_jud_code():
    assert GAZ.county_iso("BV", None) == "BV" and GAZ.county_iso(None, "8") == "BV" and GAZ.county_iso("", "40") == "B"
    assert GAZ.county_iso("XX", "999") is None and GAZ.county_iso(None, None) is None


def test_a_commune_a_village_a_town_a_municipality_and_a_sector():
    assert anaf("Com. Sânpetru").uat == "880010" and anaf("Com. Sânpetru").village is None
    assert (anaf("Sat Sânpetru Com. Sânpetru").uat, anaf("Sat Sânpetru Com. Sânpetru").village) == ("880010", "880011")
    assert anaf("Orş. Râşnov").uat == "880030" and anaf("Mun. Braşov").uat == "880001"
    sector = anaf("Sector 3 Mun. Bucureşti", "B", "40")
    assert (sector.county, sector.uat, sector.sector) == ("B", "179169", 3)


@pytest.mark.parametrize("locality", ["Orş. Râşnov", "Orş. Rîşnov", "ORŞ. RÎŞNOV", "orş. rîşnov"])
def test_a_and_i_circumflex_both_match(locality):
    assert anaf(locality).uat == "880030"


def test_cedilla_comma_below_and_ascii_match_the_cedilla_siruta_name():
    assert {anaf(f"Com. {s}").uat for s in ("Şinca Nouă", "Șinca Nouă", "Sinca Noua")} == {"880060"}


def test_initials_with_and_without_spaces_match():
    assert {anaf(f"Com. {s}", "CJ", "12").uat for s in ("I.L. Caragiale", "I. L. Caragiale", "I.L.CARAGIALE")} == {"990010"}


def test_a_typo_goes_through_the_reviewed_alias_table_only():
    assert anaf("Com. Apahda", "CJ", "12").uat == "990020"
    bare, _ = load_gazetteer(DATA)
    bare.aliases = {}
    bare.__post_init__()
    assert place_by_anaf(bare, county_auto="CJ", county_jud="12", locality="Com. Apahda").uat is None


def test_no_match_keeps_the_county_and_says_why():
    place = anaf("Com. Necunoscuta")
    assert (place.county, place.uat, place.village) == ("BV", None, None) and "Necunoscuta".upper() in place.why
    assert anaf("Braşov").uat is None and anaf(None).county == "BV"  # no kind word / no locality: county only
    assert anaf("Mun. Bucureşti", "B", "40").uat is None  # Bucharest without a sector has no UAT of its own


def test_a_name_is_matched_only_inside_its_county():
    assert anaf("Com. Sânpetru", "CJ", "12").uat is None and anaf("Com. Sânpetru", "CJ", "12").county == "CJ"


def test_a_village_is_looked_up_inside_its_uat_and_a_missing_one_leaves_the_uat():
    place = anaf("Sat Necunoscut Com. Sânpetru")
    assert (place.uat, place.village) == ("880010", None)
    assert anaf("Sat Sânpetru Com. Ucea").village == "880052"  # the same village name under another commune


def test_no_county_means_no_placement():
    assert anaf("Com. Sânpetru", None, None) is None and anaf("Com. Sânpetru", "ZZ", "77") is None


# ---- SEAP's entity view ---------------------------------------------------------------------------------------------------

def seap(city, county, address=None, postal=None):
    return place_by_seap(GAZ, city=city, county=county, address=address, postal_code=postal)


def test_the_postal_code_is_read_from_the_address():
    assert postal_code_of("Strada: Republicii, nr. 655, Sector: -, Judet: Brasov, Localitate: Sanpetru, Cod postal: 507190") == "507190"
    assert postal_code_of("fara cod") is None


def test_a_homonym_is_told_apart_by_the_postal_code():
    # Sanpetru: a commune (880010, seat village 507190) and a village of Ucea (880052, 507301)
    assert (seap("Sanpetru", "Brasov", "Cod postal: 507190").uat, seap("Sanpetru", "Brasov", "Cod postal: 507190").village) == ("880010", "880011")
    assert (seap("Sanpetru", "Brasov", "Judet: Brasov, Cod postal: 507301").uat, seap("Sanpetru", "Brasov", "Cod postal: 507301").village) == ("880050", "880052")
    assert seap("Sanpetru", "Brasov", None, postal="507301").uat == "880050"  # a separate postalCode field works too


def test_without_a_postal_code_the_name_that_is_a_uats_own_wins_else_the_county_only():
    assert seap("Sanpetru", "Brasov").uat == "880010"
    assert seap("Sanpetru", "Brasov", "Cod postal: 999999").uat == "880010"
    assert seap("Cacova", "Brasov").uat == "880030"  # a village that is no UAT's own name: found through its parent


def test_seaps_ascii_a_matches_a_siruta_circumflex_a():
    assert seap("Rasnov", "Brasov").uat == "880030" and seap("Risnov", "Brasov").uat == "880030"


def test_seap_county_names_are_ascii_and_bucharest_has_sectors():
    assert seap("Cluj-Napoca", "Cluj").uat == "990001" and seap("Huedin", "CLUJ").uat == "990030"
    sector = seap("Bucuresti", "Bucuresti", "Strada: X, Sector: 4, Judet: Bucuresti, Localitate: Bucuresti")
    assert (sector.county, sector.uat, sector.sector) == ("B", "179178", 4)
    assert seap("Bucuresti", "Bucuresti", "Judet: Bucuresti").uat is None
    assert seap("Oriunde", "NA") is None and seap("Oriunde", None) is None


def test_seap_no_match_keeps_the_county():
    place = seap("Nicaieri", "Brasov")
    assert (place.county, place.uat) == ("BV", None)


# ---- national authorities -------------------------------------------------------------------------------------------------

def test_the_notice_fields_decide_national_central_regional_or_unknown():
    cases = [
        (("Autoritate guvernamentală centrală", "Minister sau orice altă autoritate națională sau federală"), True),
        (("Autoritate guvernamentală centrală", None), True),
        ((None, "Agentie/birou national"), True),
        (("Autoritate locală", "Autoritate regională sau locală"), False),
        (("Autoritate regională", None), False),
        ((None, "De interes local sau regional"), False),
        (("Altceva", None), None),
        ((None, None), None),
    ]
    for (legal, ca), expected in cases:
        notice = {"a": {"legalBuyerType": {"text": legal}} if legal else {}, "b": [{"caType": {"text": ca, "localeKey": "Common.x"}}] if ca else []}
        assert scope.classify_notice(notice)[0] is expected, (legal, ca)


def test_a_notice_keeps_the_texts_it_was_judged_on():
    national, legal, ca = scope.classify_notice({"x": {"legalBuyerType": {"text": "Autoritate guvernamentală centrală"}, "caType": {"text": "Minister"}}})
    assert (national, legal, ca) == (True, "Autoritate guvernamentală centrală", "Minister")


def test_the_notice_flag_wins_over_the_file_unless_the_file_overrides():
    obs = lambda national: scope.Observation(national, None, None, datetime(2026, 1, 1, tzinfo=timezone.utc), "x")  # noqa: E731
    entry = lambda national, override: {"1": scope.Entry("1", national, override, "n", "r")}  # noqa: E731
    assert scope.decide("1", obs(True), entry(False, False)) == (True, "award-notice")
    assert scope.decide("1", obs(True), entry(False, True)) == (False, "file-override")
    assert scope.decide("1", obs(None), entry(True, False)) == (True, "file")
    assert scope.decide("1", None, entry(True, False)) == (True, "file")
    assert scope.decide("1", None, {}) == (False, "default")
    assert scope.decide("1", obs(False), {}) == (False, "award-notice")


def test_proposals_are_names_that_look_national_without_a_flag_or_a_line():
    obs = {"2": scope.Observation(True, None, None, datetime(2026, 1, 1, tzinfo=timezone.utc), "x")}
    entries = {"3": scope.Entry("3", True, False, "n", "r")}
    lines = scope.propose([("1", "MINISTERUL FINANTELOR"), ("2", "MINISTERUL APARARII"), ("3", "MINISTERUL SANATATII"), ("4", "COMUNA EXEMPLU")], obs, entries)
    assert len(lines) == 1 and lines[0].startswith("1,true,false,") and "proposal" in lines[0]


def test_the_shipped_classification_and_alias_files_parse_and_ship_without_entries():
    from pipeline.placement.tables import DEFAULT_DATA_DIR, read_aliases, read_counties

    assert scope.read_classification(DEFAULT_DATA_DIR) == {} and read_aliases(DEFAULT_DATA_DIR) == {}
    counties = read_counties(DEFAULT_DATA_DIR)
    assert len(counties) == 42 and len({c.iso for c in counties}) == 42 and len({c.siruta_jud for c in counties}) == 42
    assert ("B", "40") in {(c.iso, c.siruta_jud) for c in counties}


# ---- the UAT table generator ------------------------------------------------------------------------------------------------

def test_the_checked_in_fixture_tables_are_what_geo_table_makes_of_the_archived_snapshots(archive, tmp_path):
    summary = build_tables(archive, tmp_path / "out", DATA)
    for name in ("uats.csv", "villages.csv"):
        assert (tmp_path / "out" / name).read_text(encoding="utf-8") == (DATA / name).read_text(encoding="utf-8")
    assert (summary.uats, summary.villages) == (15, 12)
    assert summary.wikidata_points == 13 and summary.ancpi_points == 2  # 179196 has no Wikidata coordinate, 880010's lies outside its polygon
    assert summary.wikidata_rejected == ["880010"] and summary.no_point == []


def test_the_table_rows(archive, tmp_path):
    build_tables(archive, tmp_path, DATA)
    from pipeline.placement.tables import read_csv

    rows = {r["siruta"]: r for r in read_csv(tmp_path / "uats.csv")}
    assert rows["880001"]["name"] == "Brașov" and rows["880001"]["name_folded"] == "BRASOV" and rows["880001"]["tip"] == "1"
    assert rows["880030"]["name"] == "Râșnov" and rows["880030"]["name_folded"] == "RISNOV"
    assert rows["179169"]["name"] == "Sector 3" and rows["179169"]["county_iso"] == "B" and rows["179169"]["siruta_jud"] == "40"
    assert "179132" not in rows  # Municipiul Bucuresti is its sectors
    assert rows["880010"]["point_source"] == "ancpi_pos" and rows["880010"]["lon"] == "25.800000"  # point on surface of the rectangle
    assert rows["990020"]["point_source"] == "wikidata" and rows["990020"]["lon"] == "23.550000"  # the lower Q number, inside the polygon
    sources = json.loads((tmp_path / "table-sources.json").read_text(encoding="utf-8"))
    assert set(sources["snapshots"]) == {"siruta", "wikidata", "ancpi"} and "ANCPI" in " ".join(sources["attribution"])


def test_geo_table_needs_the_snapshots_and_a_county_table_that_agrees_with_siruta(archive, tmp_path):
    with pytest.raises(TableError, match="geo-fetch"):
        build_tables(Archive(tmp_path / "empty"), tmp_path / "out", DATA)
    wrong = tmp_path / "wrong"
    wrong.mkdir()
    (wrong / "counties.csv").write_text((DATA / "counties.csv").read_text(encoding="utf-8").replace("BV,8,Brașov", "BV,8,Brașovul"), encoding="utf-8")
    with pytest.raises(TableError, match="disagrees with SIRUTA"):
        build_tables(archive, tmp_path / "out", wrong)


# ---- TopoJSON -----------------------------------------------------------------------------------------------------------------

def decode(topo, name):
    """Features of one object as (properties, [rings as lon/lat lists]) from a TopoJSON topology (what topojson-client does)."""
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    def arc(i):
        x = y = 0
        pts = []
        for dx, dy in topo["arcs"][i]:
            x, y = x + dx, y + dy
            pts.append((x * sx + tx, y * sy + ty))
        return pts
    out = []
    for g in topo["objects"][name]["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
        out.append((g["properties"], [[arc(r[0]) for r in poly] for poly in polys], g["type"]))
    return out


def signed_area(ring):
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:])) / 2


def test_county_and_uat_topojson_are_built_and_keyed_by_iso_and_siruta(archive, tmp_path):
    out = tmp_path / "geo"
    summary = build_topojson(archive, out, DATA)
    assert (summary.counties, summary.uats) == (3, 15)
    counties = json.loads((out / "counties.topo.json").read_text(encoding="utf-8"))
    assert list(counties["objects"]) == ["counties"]
    decoded = decode(counties, "counties")
    # one dissolved shape per county of the slice (the UAT rectangles share edges), keyed `RO-<ISO>`, Romanian name, no village-level anything
    assert [(p["code"], p["name"], t) for p, _, t in decoded] == [("RO-B", "București", "Polygon"), ("RO-BV", "Brașov", "Polygon"), ("RO-CJ", "Cluj", "Polygon")]
    for props, polys, _ in decoded:
        assert len(polys) == 1 and len(polys[0]) == 1  # one exterior ring, no holes: the gaps are closed
        assert signed_area(polys[0][0]) < 0  # clockwise exterior rings, as d3-geo wants
    bv = dict((p["code"], r[0][0]) for p, r, _ in decoded)["RO-BV"]
    lons, lats = [x for x, _ in bv], [y for _, y in bv]
    assert (round(min(lons), 3), round(max(lons), 3), round(min(lats), 3), round(max(lats), 3)) == (25.5, 26.1, 45.5, 45.9)

    bv_uats = json.loads((out / "uats" / "RO-BV.topo.json").read_text(encoding="utf-8"))
    assert list(bv_uats["objects"]) == ["uats"]
    assert [(p["code"], p["name"]) for p, _, _ in decode(bv_uats, "uats")] == [("880001", "Brașov"), ("880010", "Sânpetru"), ("880030", "Râșnov"), ("880050", "Ucea"), ("880060", "Șinca Nouă")]
    sectors = json.loads((out / "uats" / "RO-B.topo.json").read_text(encoding="utf-8"))
    assert list(sectors["objects"]) == ["sectors"]
    assert sorted(p["code"] for p, _, _ in decode(sectors, "sectors")) == ["179141", "179150", "179169", "179178", "179187", "179196"]
    assert sorted(f.name for f in (out / "uats").iterdir()) == ["RO-B.topo.json", "RO-BV.topo.json", "RO-CJ.topo.json"]
    assert json.loads((out / "index.json").read_text(encoding="utf-8"))["counties"] == 3


def test_the_topojson_files_are_identical_on_a_second_build(archive, tmp_path):
    build_topojson(archive, tmp_path / "a", DATA)
    build_topojson(archive, tmp_path / "b", DATA)
    for f in sorted((tmp_path / "a").rglob("*.json")):
        assert f.read_bytes() == (tmp_path / "b" / f.relative_to(tmp_path / "a")).read_bytes()


def test_without_a_snapshot_or_a_uat_table_no_topojson_is_built_and_the_line_says_why(archive, tmp_path):
    assert "no ANCPI snapshot" in build_topojson(Archive(tmp_path / "empty"), tmp_path / "geo", DATA).line()
    empty = tmp_path / "data"
    empty.mkdir()
    shutil.copy(DATA / "counties.csv", empty / "counties.csv")
    assert "no UAT table" in build_topojson(archive, tmp_path / "geo", empty).line()
    assert not (tmp_path / "geo").exists()


# ---- geo-fetch (seam 2: HTTP stubbed) ------------------------------------------------------------------------------------------

NOW = datetime(2026, 11, 12, 10, 0, tzinfo=timezone.utc)
CKAN_BODY = json.dumps({"result": {"name": "siruta_s1-2026", "resources": [
    {"name": "Metodologie.doc", "format": "DOC", "url": "https://data.gov.ro/x/metodologie.doc"},
    {"name": "siruta_s1_2026.csv", "format": "CSV", "url": "https://data.gov.ro/x/download/siruta_s1_2026.csv"}]}}).encode()
PAGES = ancpi_pages()


class FakeHttp:
    def __init__(self, fail_page: int | None = None):
        self.calls, self.fail_page = [], fail_page

    def __call__(self, url, params=None, headers=None):
        self.calls.append((url, dict(params or {})))
        if url == geo_fetch_mod.CKAN:
            return CKAN_BODY
        if url.endswith("siruta_s1_2026.csv"):
            return siruta_csv()
        if url == geo_fetch_mod.WIKIDATA_SPARQL:
            return wikidata_json()
        if url == geo_fetch_mod.ANCPI_QUERY:
            n = int(params["resultOffset"]) // int(params["resultRecordCount"])
            if n == self.fail_page:
                raise geo_fetch_mod.GeoFetchError("boom")
            return list(PAGES.values())[n]
        raise AssertionError(url)


def test_geo_fetch_archives_the_three_sources_unchanged_dated_with_the_manifest_last(tmp_path):
    archive = Archive(tmp_path / "a")
    http = FakeHttp()
    summary = geo_fetch_mod.geo_fetch(archive, http=http, now=NOW, delay=0, sleep=lambda s: None)
    assert len(summary.archived) == 3 and summary.unchanged == []
    by = {(u.stream, u.kind): u for u in archive.units()}
    assert by[("siruta", "csv")].path.relative_to(archive.root).as_posix() == "geo/siruta/csv/siruta_s1-2026/2026-11-12"
    assert (by[("siruta", "csv")].file_path("siruta_s1_2026.csv")).read_bytes() == siruta_csv()  # byte for byte
    assert by[("wikidata", "siruta-points")].file_path("points.json").read_bytes() == wikidata_json()
    assert [by[("ancpi", "uat-polygons")].file_path(n).read_bytes() for n in sorted(by[("ancpi", "uat-polygons")].files)] == list(PAGES.values())
    for unit in by.values():  # the manifest exists and lists exactly the files, so the unit counted as complete
        manifest = json.loads((unit.path / "manifest.json").read_text(encoding="utf-8"))
        assert {f["name"] for f in manifest["files"]} == set(unit.files) and manifest["fetchedAt"] == "2026-11-12T10:00:00Z"
    assert by[("ancpi", "uat-polygons")].origin["maxAllowableOffset"] == 0.0005
    ancpi_calls = [p for u, p in http.calls if u == geo_fetch_mod.ANCPI_QUERY]
    assert [p["resultOffset"] for p in ancpi_calls] == ["0", "200"] and ancpi_calls[0]["outSR"] == "4326" and ancpi_calls[0]["f"] == "geojson"


def test_a_second_fetch_of_the_same_bytes_writes_nothing(tmp_path):
    archive = Archive(tmp_path / "a")
    geo_fetch_mod.geo_fetch(archive, http=FakeHttp(), now=NOW, delay=0, sleep=lambda s: None)
    again = geo_fetch_mod.geo_fetch(archive, http=FakeHttp(), now=NOW, delay=0, sleep=lambda s: None)
    assert again.archived == [] and len(again.unchanged) == 3 and len(archive.units()) == 3


def test_a_layer_that_stops_half_way_is_not_a_snapshot(tmp_path):
    archive = Archive(tmp_path / "a")
    with pytest.raises(geo_fetch_mod.GeoFetchError):
        geo_fetch_mod.geo_fetch(archive, ("ancpi",), http=FakeHttp(fail_page=1), now=NOW, delay=0, sleep=lambda s: None)
    assert archive.units() == [] and archive.incomplete() == []


def test_a_wikidata_answer_that_is_not_sparql_json_is_refused(tmp_path):
    with pytest.raises(geo_fetch_mod.GeoFetchError, match="SPARQL"):
        geo_fetch_mod.geo_fetch(Archive(tmp_path / "a"), ("wikidata",), http=lambda *a, **k: b"<html>", now=NOW)


def test_a_new_siruta_release_is_a_new_dataset_unit(tmp_path):
    archive = Archive(tmp_path / "a")
    geo_fetch_mod.geo_fetch(archive, ("siruta",), http=FakeHttp(), now=NOW)
    geo_fetch_mod.geo_fetch(archive, ("siruta",), http=FakeHttp(), now=NOW, siruta_dataset="siruta_s2-2026")
    assert sorted(u.unit for u in archive.units()) == ["siruta_s1-2026", "siruta_s2-2026"]


# ---- the SEAP lookups (seam 2: HTTP stubbed) -------------------------------------------------------------------------------------

class Resp:
    def __init__(self, body: bytes, status: int = 200):
        self.content, self.status_code = body, status

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(response=self)


def stub_client(posts, gets):
    seen = []

    def post(url, json=None, headers=None, timeout=None):
        seen.append(("POST", url, json))
        return Resp(posts(url, json))

    def get(url, headers=None, timeout=None):
        seen.append(("GET", url, None))
        return Resp(gets(url))

    client = LookupClient(post=post, get=get, sleep=lambda s: None, clock=iter(range(0, 10**6, 10)).__next__)
    client.seen = seen
    return client


def test_seap_entities_archives_each_answer_unchanged_and_reads_back_a_location(tmp_path):
    archive = Archive(tmp_path / "a")
    by_cif = json.dumps({"entityId": 5, "fiscalNumber": "5100089", "county": "Brasov"}).encode()
    view = json.dumps({"entityId": 5, "fiscalNumber": "5100089", "address": "Judet: Brasov, Localitate: Sanpetru, Cod postal: 507301",
                       "city": "Sanpetru", "county": "Brasov", "country": "Romania"}).encode()
    client = stub_client(lambda url, body: by_cif, lambda url: view)
    notes = []
    assert seap_lookup.lookup_locations(archive, client, ["5100089"], note=notes.append) == (1, 0)
    assert client.seen == [("POST", "https://e-licitatie.ro/api-pub/Entity/getSUEntityByCIF/", "5100089"),
                           ("GET", "https://e-licitatie.ro/api-pub/Entity/getCAEntityView/5", None)]
    [unit] = archive.units()
    assert (unit.source, unit.stream, unit.kind, unit.unit) == ("seap", "lookup", "entity-location", "5100089")
    assert unit.file_path("by-cif.json").read_bytes() == by_cif and unit.file_path("view.json").read_bytes() == view
    loc = seap_lookup.read_locations(archive)["5100089"]
    assert (loc.city, loc.county, postal_code_of(loc.address)) == ("Sanpetru", "Brasov", "507301")
    # resumable: asked again, nothing is requested
    client2 = stub_client(lambda *a: b"{}", lambda *a: b"{}")
    assert seap_lookup.lookup_locations(archive, client2, ["5100089"], note=notes.append) == (0, 0) and client2.seen == []


def test_a_foreign_or_other_entity_is_not_a_location(tmp_path):
    t = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert seap_lookup.parse_location("1", {"county": "NA", "country": "Turkiye"}, t, "x") is None
    assert seap_lookup.parse_location("1", {"county": "Brasov", "country": "Germany"}, t, "x") is None
    assert seap_lookup.parse_location("1", {"county": "Brasov", "fiscalNumber": "2", "country": "Romania"}, t, "x") is None  # another company's
    assert seap_lookup.parse_location("1", {"county": "Brasov", "fiscalNumber": "1", "country": "Romania"}, t, "x").county == "Brasov"


def test_a_failed_lookup_is_logged_and_the_run_goes_on(tmp_path):
    import requests

    archive = Archive(tmp_path / "a")

    def posts(url, body):
        if body == "1":
            raise requests.ConnectionError("down")
        return json.dumps({"entityId": 9, "city": "X", "county": "Brasov", "country": "Romania"}).encode()

    client = stub_client(posts, lambda url: b"{}")
    client.retries = 0
    notes = []
    assert seap_lookup.lookup_locations(archive, client, ["1", "2"], note=notes.append) == (1, 1)
    assert any("cui=1 failed" in n for n in notes) and [u.unit for u in archive.units()] == ["2"]


def test_authority_scope_uses_a_crawled_notice_id_or_finds_one_through_the_list(tmp_path):
    archive = Archive(tmp_path / "a")
    central = json.dumps({"section1_New": {"legalBuyerType": {"text": "Autoritate guvernamentală centrală"}}}, ensure_ascii=False).encode()
    listing = json.dumps({"items": [{"noticeNo": "CAN55", "caNoticeId": 7001}]}).encode()
    client = stub_client(lambda url, body: listing, lambda url: central)
    todo = [scope.Candidate("111", "9001", None), scope.Candidate("222", None, "CAN55"), scope.Candidate("333", None, "CAN404")]
    assert scope.lookup_scopes(archive, client, todo, note=lambda s: None) == (3, 0)
    assert [s for s in client.seen if s[0] == "GET"] == [("GET", "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/9001", None),
                                                          ("GET", "https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/7001", None)]
    post = [s for s in client.seen if s[0] == "POST"][0]
    assert post[1].endswith("/NoticeCommon/GetCANoticeList/") and post[2]["number"] == "CAN55"
    observed = scope.read_scopes(archive)
    assert set(observed) == {"111", "222"} and observed["111"].national is True and observed["111"].legal_buyer_type == "Autoritate guvernamentală centrală"
    assert scope.lookup_scopes(archive, stub_client(lambda *a: b"{}", lambda *a: b"{}"), todo, note=lambda s: None) == (0, 0)  # resumable
