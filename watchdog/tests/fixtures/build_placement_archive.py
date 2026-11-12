"""Builds `archive-placement/` and `placement-data/`, the raw-archive fixture for placement (ticket #67). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_placement_archive.py

Everything is invented: the SIRUTA codes (88xxxx Brasov county, 99xxxx Cluj county; the six Bucharest sectors keep their real
codes because the matcher looks them up), the geometry (one rectangle per UAT on a grid), the CUIs (valid check digits, made
here), the names of the authorities. The names of the places are real-looking on purpose: they carry the spelling cases the
matching rules are about (cedilla in SIRUTA, comma-below in ANAF, ASCII in SEAP, Â/Î, initials, a typo).

The archive holds what a real one would: a DA bulk file, ANAF answers (the real v9 shape), SEAP entity lookups, award-notice
lookups, and the three geography snapshots (SIRUTA CSV, Wikidata SPARQL JSON, ANCPI GeoJSON pages) written by `geo-fetch`'s own
`_store`. `placement-data/` is what the operator's `geo-table` makes of those snapshots (this script runs it), plus the two
reviewed files and the typo alias file of the fixture world.
"""
from __future__ import annotations

import csv
import io
import json
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(HERE))

from build_identity_archive import DA_HEADER, anaf_entry, anaf_response, da_row  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.geo.fetch import GeoFetchSummary, _store  # noqa: E402
from pipeline.geo.table import build_tables  # noqa: E402
from pipeline.identity import cui_check_digit_ok  # noqa: E402
from pipeline.placement import lookup  # noqa: E402

OUT = HERE / "archive-placement"
DATA = HERE / "placement-data"


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def make_cui(body: int) -> str:
    for digit in range(10):
        if cui_check_digit_ok(f"{body}{digit}"):
            return f"{body}{digit}"
    raise AssertionError(body)


# ---- the invented geography: SIRUTA rows, one rectangle per UAT -----------------------------------------------------------
# (siruta, name as SIRUTA writes it, CODP, JUD, SIRSUP, TIP, NIV)
SIRUTA = [
    ("8", "JUDEŢUL BRAŞOV", "0", "8", "1", "40", "1"),
    ("12", "JUDEŢUL CLUJ", "0", "12", "1", "40", "1"),
    ("179132", "MUNICIPIUL BUCUREŞTI", "0", "40", "40", "9", "2"),
    ("40", "MUNICIPIUL BUCUREŞTI", "0", "40", "1", "40", "1"),
    ("880001", "MUNICIPIUL BRAŞOV", "0", "8", "8", "1", "2"), ("880002", "BRAŞOV", "500001", "8", "880001", "9", "3"),
    ("880010", "SÂNPETRU", "0", "8", "8", "3", "2"), ("880011", "SÂNPETRU", "507190", "8", "880010", "10", "3"),
    ("880013", "SATU NOU", "507191", "8", "880010", "10", "3"),
    ("880030", "ORAŞ RÂŞNOV", "0", "8", "8", "2", "2"), ("880031", "RÂŞNOV", "505400", "8", "880030", "9", "3"),
    ("880032", "CACOVA", "505401", "8", "880030", "10", "3"),
    ("880050", "UCEA", "0", "8", "8", "3", "2"), ("880051", "UCEA", "507300", "8", "880050", "10", "3"),
    ("880052", "SÂNPETRU", "507301", "8", "880050", "10", "3"),
    ("880060", "ŞINCA NOUĂ", "0", "8", "8", "3", "2"), ("880061", "ŞINCA NOUĂ", "507200", "8", "880060", "10", "3"),
    ("990001", "MUNICIPIUL CLUJ-NAPOCA", "0", "12", "12", "1", "2"), ("990002", "CLUJ-NAPOCA", "400001", "12", "990001", "9", "3"),
    ("990010", "I. L. CARAGIALE", "0", "12", "12", "3", "2"), ("990011", "I. L. CARAGIALE", "407100", "12", "990010", "10", "3"),
    ("990020", "APAHIDA", "0", "12", "12", "3", "2"), ("990021", "APAHIDA", "407035", "12", "990020", "10", "3"),
    ("990030", "ORAŞ HUEDIN", "0", "12", "12", "2", "2"), ("990031", "HUEDIN", "405300", "12", "990030", "9", "3"),
    ("179141", "BUCUREŞTI SECTORUL 1", "0", "40", "179132", "6", "3"), ("179150", "BUCUREŞTI SECTORUL 2", "0", "40", "179132", "6", "3"),
    ("179169", "BUCUREŞTI SECTORUL 3", "0", "40", "179132", "6", "3"), ("179178", "BUCUREŞTI SECTORUL 4", "0", "40", "179132", "6", "3"),
    ("179187", "BUCUREŞTI SECTORUL 5", "0", "40", "179132", "6", "3"), ("179196", "BUCUREŞTI SECTORUL 6", "0", "40", "179132", "6", "3"),
]
# one rectangle (west, south, east, north) per UAT; neighbours share edges so the counties dissolve into one shape each
CELLS = {
    "880001": (25.5, 45.5, 25.7, 45.7), "880010": (25.7, 45.5, 25.9, 45.7), "880030": (25.5, 45.7, 25.7, 45.9),
    "880050": (25.7, 45.7, 25.9, 45.9), "880060": (25.9, 45.5, 26.1, 45.7),
    "990001": (23.5, 46.7, 23.7, 46.9), "990010": (23.7, 46.7, 23.9, 46.9), "990020": (23.5, 46.9, 23.7, 47.1), "990030": (23.7, 46.9, 23.9, 47.1),
    "179141": (26.0, 44.4, 26.05, 44.45), "179150": (26.05, 44.4, 26.1, 44.45), "179169": (26.1, 44.4, 26.15, 44.45),
    "179178": (26.0, 44.45, 26.05, 44.5), "179187": (26.05, 44.45, 26.1, 44.5), "179196": (26.1, 44.45, 26.15, 44.5),
}
# Wikidata points: most inside their polygon; 880010's lies in another UAT's cell (rejected, the polygon's point on surface is used);
# 990020 has two items (the lower Q number inside the polygon wins); 179196 has no item at all
WIKIDATA = {
    "880001": [(1001, 25.6, 45.6)], "880010": [(1002, 25.6, 45.6)], "880030": [(1003, 25.62, 45.78)], "880050": [(1004, 25.8, 45.8)],
    "880060": [(1005, 26.0, 45.6)], "990001": [(2001, 23.6, 46.8)], "990010": [(2002, 23.8, 46.8)],
    "990020": [(2004, 23.9, 46.9), (2003, 23.55, 46.95)], "990030": [(2005, 23.8, 47.0)],
    "179141": [(3001, 26.02, 44.42)], "179150": [(3002, 26.07, 44.42)], "179169": [(3003, 26.12, 44.42)],
    "179178": [(3004, 26.02, 44.47)], "179187": [(3005, 26.07, 44.47)],
}


def siruta_csv() -> bytes:
    out = io.StringIO()
    out.write("﻿SIRUTA;DENLOC;CODP;JUD;SIRSUP;TIP;NIV;MED;REGIUNE;FSJ;NUTS;LAU\r\n")
    for siruta, name, codp, jud, sirsup, tip, niv in SIRUTA:
        out.write(f"{siruta};{name};{codp};{jud};{sirsup};{tip};{niv};1;7;1;RO121;{'RO_' + siruta if niv == '2' else ''}\r\n")
    return out.getvalue().encode("utf-8")


def wikidata_json() -> bytes:
    bindings = []
    for siruta, items in WIKIDATA.items():
        for q, lon, lat in items:
            bindings.append({"item": {"type": "uri", "value": f"http://www.wikidata.org/entity/Q{q}"},
                             "siruta": {"type": "literal", "value": siruta},
                             "coord": {"datatype": "http://www.opengis.net/ont/geosparql#wktLiteral", "type": "literal", "value": f"Point({lon} {lat})"}})
    bindings.append({"item": {"type": "uri", "value": "http://www.wikidata.org/entity/Q9"}, "siruta": {"type": "literal", "value": "179196"}})  # no coordinate
    return json.dumps({"head": {"vars": ["item", "siruta", "coord"]}, "results": {"bindings": bindings}}, indent=1).encode()


def ancpi_pages() -> dict[str, bytes]:
    """Two pages of the layer, in the shape the live service answered on 2026-11-12 (GeoJSON, WGS84, `nationalCode`)."""
    features = []
    for i, (siruta, (w, s, e, n)) in enumerate(sorted(CELLS.items()), start=1):
        names = {r[0]: r[1] for r in SIRUTA}
        features.append({"type": "Feature", "id": i, "geometry": {"type": "Polygon", "coordinates": [[[w, s], [w, n], [e, n], [e, s], [w, s]]]},
                         "properties": {"OBJECTID": i, "nationalCode": siruta, "name_1": names[siruta], "nationalLevel": "3rdOrder", "country": "RO"}})
    half = len(features) // 2 + 1
    pages = {}
    for n, chunk in enumerate((features[:half], features[half:])):
        doc = {"type": "FeatureCollection", "crs": {"type": "name", "properties": {"name": "EPSG:4326"}}, "features": chunk}
        if n == 0:
            doc["properties"] = {"exceededTransferLimit": True}
        pages[f"page-{n:04d}.geojson"] = json.dumps(doc).encode()
    return pages


# ---- the authorities ------------------------------------------------------------------------------------------------------
SUPPLIER = ("SANTIERUL TARA DEMO SRL", "2000007")  # ANAF-found, seat in Brasov municipality: a supplier is placed too
CUI = {key: make_cui(body) for key, body in {
    "sanpetru": 5100000, "caragiale": 5100010, "apahida": 5100020, "rasnov": 5100030, "sinca": 5100040, "brasov": 5100050, "bucharest3": 5100060,
    "unmatched": 5100070, "seap": 5100080, "unplaced": 5100090, "ministry": 5100100, "agency": 5100110, "dsp": 5100120, "huedin": 5100130,
}.items()}

# key -> (authority name as SEAP has it, ANAF locality string, county ISO, ANAF JUD code, ANAF postal code)
ANAF = {
    "sanpetru": ("COMUNA SANPETRU", "Sat Sânpetru Com. Sânpetru", "BV", "8", "507190"),  # a village in a commune (cedilla-free ANAF: Î/Â)
    "caragiale": ("COMUNA I.L. CARAGIALE", "Com. I.L. Caragiale", "CJ", "12", "407100"),  # initials without spaces vs `I. L.` in SIRUTA
    "apahida": ("COMUNA APAHIDA", "Com. Apahda", "CJ", "12", "407035"),  # a typo: the alias file fixes it
    "rasnov": ("ORAS RASNOV", "Orş. Rîşnov", "BV", "8", "505400"),  # a town; Î where SIRUTA writes Â; cedilla Ş
    "sinca": ("COMUNA SINCA NOUA", "Com. Șinca Nouă", "BV", "8", "507200"),  # comma-below where SIRUTA writes cedilla
    "brasov": ("MUNICIPIUL BRASOV", "Mun. Braşov", "BV", "8", "500001"),  # a municipality
    "bucharest3": ("PRIMARIA SECTORULUI 3", "Sector 3 Mun. Bucureşti", "B", "40", "030167"),  # a Bucharest sector
    "unmatched": ("COMUNA FARA NUME", "Com. Necunoscuta", "BV", "8", "500999"),  # not in SIRUTA: the county only, with a log line
    "huedin": ("ORAS HUEDIN", "Orş. Huedin", "CJ", "12", "405300"),
    "ministry": ("MINISTERUL EXEMPLULUI", "Sector 1 Mun. Bucureşti", "B", "40", "010011"),  # national: the award notice says central
    "agency": ("AGENTIA NATIONALA DEMO", "Sector 2 Mun. Bucureşti", "B", "40", "020022"),  # national: only the reviewed file says so
    "dsp": ("DIRECTIA DE SANATATE PUBLICA DEMO", "Mun. Braşov", "BV", "8", "500002"),  # the notice says central, the file overrides: local
}
NOT_IN_ANAF = ("seap", "unplaced")  # asked, notFound
SEAP_NAMES = {"seap": "COMUNA UCEA SPITAL ASIMILAT", "unplaced": "ASOCIATIA FARA ADRESA"}

DA_FILE = "raport-achizitii-directe-t1-2023.csv"


def notice(legal: str, ca_type: str) -> bytes:
    """An award notice detail, with only the parts the scope rule reads, at the paths the research found them."""
    doc = {"caNoticeId": 100662702, "section1_New": {
        "section1_1": {"caAddress": {"county": {"id": 4, "text": "Bucuresti", "localeKey": "B"}, "legalBuyerType": {"id": 1, "text": legal, "localeKey": "x"}}},
        "section1_4_New": {"caType": {"id": 9, "text": ca_type, "localeKey": "Common.Clasiff.ContractingAuthorityType.x"}}}}
    return json.dumps(doc, ensure_ascii=False).encode()


def build() -> None:
    for p in (OUT, DATA):
        if p.exists():
            shutil.rmtree(p)
    a = Archive(OUT)
    names = {**{k: v[0] for k, v in ANAF.items()}, **SEAP_NAMES}
    rows = [DA_HEADER] + [da_row(f"DA94{i:06d}", 10 + i, SUPPLIER[0], SUPPLIER[1], (names[k], CUI[k]), value="1000") for i, k in enumerate(sorted(names), start=1)]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15), files={DA_FILE: ("\n".join(rows) + "\n").encode()},
                 via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/" + DA_FILE)

    found = []
    for key, (name, locality, county, jud, postal) in ANAF.items():
        entry = anaf_entry(int(CUI[key]), name, locality=locality, county=county, code=jud)
        entry["adresa_sediu_social"]["scod_Postal"] = postal
        entry["adresa_sediu_social"]["sdenumire_Judet"] = {"BV": "BRAŞOV", "CJ": "CLUJ", "B": "MUNICIPIUL BUCUREŞTI"}[county]
        found.append(entry)
    found.append(anaf_entry(2000007, "ŞANTIERUL ŢARA DEMO SRL", locality="Mun. Braşov", county="BV", code="8"))
    asked = sorted([e["date_generale"]["cui"] for e in found] + [int(CUI[k]) for k in NOT_IN_ANAF])
    archive_batch(a, asked, date(2026, 11, 1), anaf_response(found, [int(CUI[k]) for k in NOT_IN_ANAF]), at(2026, 11, 1, 8))

    # SEAP's entity view for the CUI ANAF misses: `Sanpetru` is also a village of commune Ucea; the postal code in the address says which
    by_cif = json.dumps({"entityId": 777001, "fiscalNumber": CUI["seap"], "entityName": SEAP_NAMES["seap"], "county": "Brasov", "country": "Romania"}).encode()
    view = json.dumps({"isUtility": False, "entityId": 777001, "fiscalNumber": CUI["seap"], "entityName": SEAP_NAMES["seap"],
                       "address": "Strada: Principala, nr. 1, Sector: -, Judet: Brasov, Localitate: Sanpetru, Cod postal: 507301",
                       "city": "Sanpetru", "county": "Brasov", "country": "Romania", "postalCode": None}).encode()
    lookup.archive_lookup(a, "entity-location", CUI["seap"], {"byCif": {"body": CUI["seap"]}, "view": {"path": "/api-pub/Entity/getCAEntityView/777001"}},
                          {"by-cif.json": by_cif, "view.json": view}, at(2026, 11, 5))
    # award notices: the ministry's says central; the DSP's says central too (the file overrides); Brasov municipality's says local
    for key, legal, ca in (("ministry", "Autoritate guvernamentală centrală", "Minister sau orice altă autoritate națională sau federală"),
                           ("dsp", "Autoritate guvernamentală centrală", "Serviciul public deconcentrat"),
                           ("brasov", "Autoritate locală", "Autoritate regională sau locală")):
        lookup.archive_lookup(a, "authority-notice", CUI[key], {"notice": {"path": "/api-pub/C_PUBLIC_CANotice/get/100662702"}},
                              {"notice.json": notice(legal, ca)}, at(2026, 11, 6))

    # the geography snapshots, written the way `geo-fetch` writes them
    summary, now = GeoFetchSummary(), at(2026, 11, 12)
    _store(a, summary, source="geo", stream="siruta", kind="csv", unit="siruta_s1-2026", files={"siruta_s1_2026.csv": siruta_csv()},
           url="https://data.gov.ro/fixture/siruta_s1_2026.csv", origin={"system": "data.gov.ro", "dataset": "siruta_s1-2026"}, now=now)
    _store(a, summary, source="geo", stream="wikidata", kind="siruta-points", unit="p843-p625", files={"points.json": wikidata_json(), "query.sparql": b"SELECT 1\n"},
           url="https://query.wikidata.org/sparql", origin={"system": "Wikidata Query Service"}, now=now)
    _store(a, summary, source="geo", stream="ancpi", kind="uat-polygons", unit="layer-1", files=ancpi_pages(),
           url="https://example.invalid/FeatureServer/1/query", origin={"system": "ANCPI ArcGIS feature service", "maxAllowableOffset": 0.0005}, now=now)

    # the placement data directory: the shipped counties, what `geo-table` makes of the snapshots, and the two reviewed files
    DATA.mkdir()
    shutil.copy(WATCHDOG / "pipeline/placement/data/counties.csv", DATA / "counties.csv")
    (DATA / "locality_aliases.csv").write_text("county,anaf_name,siruta_name\nCJ,Apahda,Apahida\n", encoding="utf-8")
    (DATA / "national_authorities.csv").write_text(
        "cui,national,override,name,reason\n"
        f'{CUI["agency"]},true,false,AGENTIA NATIONALA DEMO,"fictional: a national agency with only direct purchases, no award notice"\n'
        f'{CUI["dsp"]},false,true,DIRECTIA DE SANATATE PUBLICA DEMO,"fictional: a county unit; the notice says central, the file overrides it"\n',
        encoding="utf-8")
    build_tables(a, DATA, DATA)


if __name__ == "__main__":
    build()
    print(f"wrote {OUT} and {DATA}")
