"""Builds `archive-aep/`, the fixture for AEP's Mandates, the Leadership list and Party per Record (ticket #180). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_aep_archive.py

It is an OVERLAY for the placement world (`archive-placement` + `archive-mf`, see build_placement_archive.py / build_mf_archive.py): the same invented
authorities (Brasov municipality, Sanpetru, Rasnov, Sinca Noua, Caragiale, Apahida, sector 3) plus a county council (Cluj) and Bucharest's city hall
(ANAF answers added here), AEP's results in the real shape (the JSON per county, the repeat round's two CSVs, the 2025 CSVs, all small), two newer
MF snapshots with principal credit holders, and the SEAP Records that meet the mandates. Candidate names are invented; parties are real registered names.

What the slice shows (the 2020 mandates run 2020-10-27 to 2024-09-27, the handover window to 2024-10-27, the 2024 mandates from then; see pipeline/aep/mandates.py):
- Brasov municipality: PSD in 2020, the SAME person on the PNL list in 2024 (a party switch: two mandates, never "current party"). A Record in the handover
  window (2024-10-10) gets no Party.
- Sanpetru: an alliance (USR PLUS, member parties recorded) in 2020, an independent in 2024 ("Independent" is no party).
- Rasnov: PNL in 2020, PSD in 2024, then a partial election on 2025-12-07 won by PNL: the 2024 mandate is cut 90 days before it (2025-09-08), a Record
  in the interim (2025-10-15) gets no Party, a Record after the partial winner's oath (2026-02-10) gets PNL.
- Sinca Noua: a tie in September 2020, decided by the October 2020 repeat round (PSD, in force from 2020-11-10); absent from the 2024 minutes: a mandate
  without results, a gap.
- Apahida (an independent in 2020, PSD in 2024), Caragiale (PNL, absent 2024 tie), sector 3 (PSD, PNL), Cluj county council (county president), Bucharest's
  general mayor.
- MF principals: the hospital has Brasov municipality as its only principal in both snapshots (inherits); the school has the municipality AND the ministry
  (no Party); the roads directorate has the municipality in the newest snapshot but Rasnov in the older one (a contradicted tie: no Party).
"""
from __future__ import annotations

import json
import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import xlwt

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(HERE))

from build_identity_archive import DA_HEADER, anaf_entry, anaf_response  # noqa: E402
from build_mf_archive import HEADER as MF_HEADER, MF_ONLY, ROWS as MF_ROWS  # noqa: E402
from build_placement_archive import CUI, SUPPLIER, make_cui  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-aep"
NEW = {key: make_cui(body) for key, body in {"cj_council": 5100300, "pmb": 5100310, "hospital": 5100320, "roads": 5100330}.items()}
NAMES = {"cj_council": "CONSILIUL JUDETEAN CLUJ", "pmb": "MUNICIPIUL BUCURESTI", "hospital": "SPITALUL CLINIC JUDETEAN DEMO BRASOV",
         "roads": "DIRECTIA DRUMURILOR DEMO BRASOV", "school": "SCOALA GIMNAZIALA FICTIVA BRASOV"}


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def minutes(rows_uat: list[dict], rows_cnty: list[dict]) -> bytes:
    """One county's final minutes in the real shape (AEP's `pv_<county>_final.json`): only the parts the reader uses plus the identifying fields."""
    def table(rows, scope):
        return {r["id"]: {"votes": [{"candidate": c, "party": p, "votes": str(v)} for c, p, v in r["votes"]], "report_id": "1", "report_created_at": "2024-06-13 19:41:42",
                          "report_version": "2", "uat_id": r["id"] if scope == "UAT" else None, "uat_name": r.get("uat"), "uat_siruta": r.get("siruta"), "county_id": "8",
                          "county_code": r["county"], "county_name": r["county_name"], "report_type_scope_code": scope, "report_stage_code": "FINAL"} for r in rows}
    doc = {"stages": {"PROV": {"enabled": False}, "PART": {"enabled": False},
                      "FINAL": {"enabled": True, "scopes": {"UAT": {"categories": {"P": {"files": {}, "table": table(rows_uat, "UAT")}}},
                                                           "CNTY": {"categories": {"PCJ": {"files": {}, "table": table(rows_cnty, "CNTY")}}}}}},
           "info": {"precincts_count": 1, "counties_count": 42, "generation_time": "2024-07-12 15:00:02"}}
    return json.dumps(doc, ensure_ascii=False).encode()


PSD, PNL, ALDE = "PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL", "PARTIDUL ALIANŢA LIBERALILOR ŞI DEMOCRAŢILOR – ALDE"  # ALDE with cedilla letters, as AEP writes it
USR = "ALIANȚA USR PLUS"


def uat(id_, name, siruta, county, county_name, votes):
    return {"id": id_, "uat": name, "siruta": siruta, "county": county, "county_name": county_name, "votes": votes}


FINAL_2020 = {
    "bv": minutes([
        uat("1", "BRAȘOV", "880001", "BV", "BRAŞOV", [("POPESCU ION", PSD, 5000), ("IONESCU VASILE", PNL, 4000), ("RADU MARIA", USR, 900)]),
        uat("2", "SÂNPETRU", "880010", "BV", "BRAŞOV", [("MARIN ANA", USR, 800), ("DUMITRU PAUL", PSD, 500)]),
        uat("3", "RÂȘNOV", "880030", "BV", "BRAŞOV", [("STAN MIRCEA", PNL, 1500), ("CHIRIAC ANA", PSD, 1200)]),
        uat("4", "ȘINCA NOUĂ", "880060", "BV", "BRAŞOV", [("GHEORGHE TUDOR", PSD, 300), ("LUPU DAN", PNL, 300)]),  # a tie: no winner here, the repeat round decides
    ], [{"id": "8", "county": "BV", "county_name": "BRAŞOV", "votes": [("CRISTEA OVIDIU", PNL, 90000), ("PANȚIRU LIVIU", PSD, 80000)]}]),
    "cj": minutes([
        uat("5", "I.L. CARAGIALE", "990010", "CJ", "CLUJ", [("TOMA GEORGE", PNL, 700), ("ENE VLAD", PSD, 650)]),
        uat("6", "APAHIDA", "990020", "CJ", "CLUJ", [("BARBU SORIN", None, 2100), ("COSTEA RADU", PNL, 1900)]),  # an independent wins (no list)
    ], [{"id": "12", "county": "CJ", "county_name": "CLUJ", "votes": [("MUNTEANU ALIN", PNL, 120000), ("SERBAN IOANA", PSD, 100000)]}]),
    "b": minutes([
        uat("3479", "BUCUREŞTI SECTORUL 3", "179169", "B", "MUNICIPIUL BUCUREŞTI", [("NEAGU HORIA", PSD, 50000), ("VLAD CLAUDIA", PNL, 40000)]),
    ], [{"id": "42", "county": "B", "county_name": "MUNICIPIUL BUCUREŞTI", "votes": [("DUMITRESCU CEZAR", USR, 300000), ("MANEA OVIDIU", PSD, 280000)]}]),
}
FINAL_2024 = {
    "bv": minutes([
        uat("1", "BRAȘOV", "880001", "BV", "BRAŞOV", [("POPESCU ION", PNL, 6000), ("IONESCU VASILE", PSD, 3000)]),  # the same person, another list
        uat("2", "SÂNPETRU", "880010", "BV", "BRAŞOV", [("TOMA LUCIAN", None, 900), ("DUMITRU PAUL", PSD, 600)]),  # an independent
        uat("3", "RÂȘNOV", "880030", "BV", "BRAŞOV", [("STAN MIRCEA", PSD, 1700), ("CHIRIAC ANA", PNL, 1600)]),
    ], [{"id": "8", "county": "BV", "county_name": "BRAŞOV", "votes": [("CRISTEA OVIDIU", PNL, 95000), ("PANȚIRU LIVIU", PSD, 70000)]}]),  # Sinca Noua is absent
    "cj": minutes([
        uat("5", "I.L. CARAGIALE", "990010", "CJ", "CLUJ", [("TOMA GEORGE", PNL, 700), ("ENE VLAD", PSD, 700)]),  # a tie: no winner
        uat("6", "APAHIDA", "990020", "CJ", "CLUJ", [("BARBU SORIN", PSD, 2500), ("COSTEA RADU", PNL, 1900)]),
    ], [{"id": "12", "county": "CJ", "county_name": "CLUJ", "votes": [("MUNTEANU ALIN", PNL, 130000), ("SERBAN IOANA", PSD, 100000)]}]),
    "b": minutes([
        uat("3479", "BUCUREŞTI SECTORUL 3", "179169", "B", "MUNICIPIUL BUCUREŞTI", [("NEAGU HORIA", PSD, 45000), ("VLAD CLAUDIA", PNL, 50000)]),
    ], [{"id": "42", "county": "B", "county_name": "MUNICIPIUL BUCUREŞTI", "votes": [("DUMITRESCU CEZAR", USR, 280000), ("MANEA OVIDIU", PNL, 300000)]}]),
}
REPEAT = {
    "pv_final_cntry_p_tur2.csv": ("﻿county_nce;county_name;uat_name;report_version;created_at;a;a1;a2;a3;a4;b;b1;b2;b3;b4;c;d;e;f;"
                                  "GHEORGHE TUDOR-PARTIDUL SOCIAL DEMOCRAT-voturi;LUPU DAN-PARTIDUL NAȚIONAL LIBERAL-voturi\n"
                                  "8;BRAŞOV;ȘINCA NOUĂ;1;11.10.2020 23:50;900;880;0;5;15;700;690;0;5;15;680;10;1000;400;350;330\n"),
    "bd_p_11.10.2020.csv": ("﻿county_nce;county_name;nr_sv;den_sv;uat_name;uat_siruta;a;a1;a2;a3;a4;b;b1;b2;b3;b4;c;d;e;f;Competitor;TVVE\n"
                            "8;BRAŞOV;12;ȘCOALA DEMO;ȘINCA NOUĂ;880060;900;880;0;5;15;700;690;0;5;15;680;10;1000;400;PARTIDUL SOCIAL DEMOCRAT;350\n"),
}
PARTIAL_HEADER = ("precinct_county_nce,precinct_county_name,precinct_name,precinct_nr,uat_name,uat_siruta,report_version,report_stage_code,report_type_scope_code,"
                  "report_type_category_code,report_type_code,created_at,a,a1,a2,a3,a4,b,b1,b2,b3,b4,c,d,e,f,"
                  '"DOBRE SORIN-PARTIDUL NAȚIONAL LIBERAL-voturi","CHIRIAC ANA-PARTIDUL SOCIAL DEMOCRAT-voturi","VASILE ION-CANDIDAT INDEPENDENT-voturi"\n')
PARTIAL = {
    "pv_part_uat_p_bv_880030.csv": ("﻿" + PARTIAL_HEADER
                                    + '8,BRAȘOV,"ȘCOALA 1",1,RÂȘNOV,880030,1,PART,PRCNCT,P,P_SV,"2025-12-07 21:54:04",900,880,0,0,20,500,480,0,0,20,480,0,1000,400,150,100\n'
                                    + '8,BRAȘOV,"ȘCOALA 2",2,RÂȘNOV,880030,1,PART,PRCNCT,P,P_SV,"2025-12-07 22:10:00",800,790,0,0,10,500,490,0,0,10,490,0,900,300,130,60\n'),
}
# AEP's JSON for the other counties does not matter here: only these three are archived, as `fetch_aep(counties=...)` is told
COUNTIES = ("bv", "cj", "b")


def write_aep(a: Archive) -> None:
    def put(stream, unit, files, via, origin):
        a.write_unit(source="aep", stream=stream, kind="local", unit=unit, fetched_at=at(2026, 11, 14), files=files, url="https://example.invalid/aep", via=via, origin=origin)
    put("final", "2020-09-27", {f"pv_{c}_final.json": FINAL_2020[c] for c in COUNTIES}, "AEP final minutes, local elections 27 September 2020", {"system": "AEP"})
    put("final", "2024-06-09", {f"pv_{c}_final.json": FINAL_2024[c] for c in COUNTIES}, "AEP final minutes, local elections 9 June 2024 (Code for Romania backup)", {"system": "AEP"})
    put("repeat", "2020-10-11", {k: v.encode() for k, v in REPEAT.items()}, "AEP repeat round, 11 October 2020", {"system": "data.gov.ro"})
    put("partial", "2025-12-07", {k: v.encode() for k, v in PARTIAL.items()}, "AEP partial elections, December 2025 (Code for Romania backup)",
        {"system": "AEP", "dataThrough": "2025-12-09", "oneOff": True, "upstream": {k: "sha-fixture" for k in PARTIAL}})


def write_mf(a: Archive) -> None:
    """Two MF snapshots (newer than the placement world's 2026-11-01) with principal credit holders; the older one has the roads directorate under Rasnov."""
    rows = MF_ROWS + [("Brasov", NEW["hospital"], NAMES["hospital"], "Municipiul Brasov"), ("Brasov", NEW["roads"], NAMES["roads"], "Municipiul Brasov"),
                      ("Cluj", NEW["cj_council"], NAMES["cj_council"], "Municipiul Cluj-Napoca"), ("Bucuresti", NEW["pmb"], NAMES["pmb"], "Municipiul Bucuresti")]
    newest = {NEW["hospital"]: (CUI["brasov"], ""), MF_ONLY["bv_school"]: (CUI["brasov"], CUI["ministry"]), NEW["roads"]: (CUI["brasov"], "")}
    older = {**newest, NEW["roads"]: (CUI["rasnov"], "")}
    for unit, day, principals in (("2026-10-01", at(2026, 10, 5), older), ("2026-12-01", at(2026, 12, 5), newest)):
        book = xlwt.Workbook()
        sheet = book.add_sheet("Sheet1")
        for c, h in enumerate(MF_HEADER):
            sheet.write(0, c, h)
        for r, (county, cui, name, uat_name) in enumerate(rows, start=1):
            p1, p2 = principals.get(cui, ("", ""))
            for c, v in enumerate([county, cui, "", name, uat_name, f"{county}, {uat_name}", p1, "", p2, ""]):
                sheet.write(r, c, v)
        tmp = HERE / "_tmp_aep_mf.xls"
        book.save(str(tmp))
        name = f"lista_ep_portal_{unit[8:]}{unit[5:7]}{unit[:4]}.xls"
        origin = {"system": "data.gov.ro", "dataset": "listaentitatipublice", "resourceId": f"00000000-fixture-{unit}", "resourceName": name, "url": f"https://data.gov.ro/fixture/{name}",
                  "lastModified": "2026-11-06T11:28:26.101125", "size": tmp.stat().st_size, "hash": "", "format": "XLS"}
        a.write_unit(source="mf", stream="list", kind="entities", unit=unit, fetched_at=day, files={name: tmp}, url=origin["url"], via=name, origin=origin)
        tmp.unlink()


def da_row(code, d: date, authority, cui):
    return (f"|{code}|,|{d:%m/%d/%Y}|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|Achizitie {code}|,|30197000-6|,"
            f"|Articole de papetarie (Rev.2)|,|{d:%m/%d/%Y}|,1000,1000,|{SUPPLIER[0]}|,|{SUPPLIER[1]}|")


def write_seap(a: Archive) -> None:
    """DA Records that meet the mandates; the code says what it shows. Authority names are the placement world's (ANAF's spelling)."""
    brasov, rasnov = ("MUNICIPIUL BRASOV", CUI["brasov"]), ("ORAS RASNOV", CUI["rasnov"])
    cases = {
        "2024Q4": [("DA95000001", date(2024, 10, 10), brasov), ("DA95000002", date(2024, 11, 15), brasov),
                   ("DA95000003", date(2024, 11, 20), (NAMES["hospital"], NEW["hospital"])), ("DA95000004", date(2024, 11, 20), (NAMES["school"], MF_ONLY["bv_school"])),
                   ("DA95000005", date(2024, 11, 20), (NAMES["roads"], NEW["roads"])), ("DA95000006", date(2024, 12, 1), (NAMES["cj_council"], NEW["cj_council"])),
                   ("DA95000007", date(2024, 12, 2), (NAMES["pmb"], NEW["pmb"])), ("DA95000008", date(2024, 11, 25), ("COMUNA SANPETRU", CUI["sanpetru"])),
                   ("DA95000009", date(2024, 11, 26), ("COMUNA APAHIDA", CUI["apahida"])), ("DA95000010", date(2024, 11, 27), ("COMUNA SINCA NOUA", CUI["sinca"])),
                   ("DA95000011", date(2024, 11, 28), ("COMUNA I.L. CARAGIALE", CUI["caragiale"]))],
        "2025Q2": [("DA95000012", date(2025, 6, 10), rasnov)],
        "2025Q4": [("DA95000013", date(2025, 10, 15), rasnov)],
        "2026Q1": [("DA95000014", date(2026, 2, 10), rasnov)],
    }
    for quarter, rows in cases.items():
        q = f"t{quarter[-1]}-{quarter[:4]}"
        body = "\n".join([DA_HEADER] + [da_row(code, d, auth[:2] if len(auth) > 2 else auth, SUPPLIER[1]) for code, d, auth in rows]) + "\n"
        name = f"raport-achizitii-directe-{q}.csv"
        a.write_unit(source="seap", stream="bulk", kind="da", unit=quarter, fetched_at=at(2026, 11, 14), files={name: body.encode()}, via=f"Achizitii directe {quarter}",
                     url="https://data.gov.ro/fixture/" + name)


def write_anaf(a: Archive) -> None:
    found = [anaf_entry(int(NEW["cj_council"]), NAMES["cj_council"], locality="Mun. Cluj-Napoca", county="CJ", code="12"),
             anaf_entry(int(NEW["pmb"]), NAMES["pmb"], locality="Sector 5 Mun. Bucureşti", county="B", code="40")]
    for e, postal, judet in zip(found, ("400001", "050011"), ("CLUJ", "MUNICIPIUL BUCUREŞTI")):
        e["adresa_sediu_social"]["scod_Postal"] = postal
        e["adresa_sediu_social"]["sdenumire_Judet"] = judet
    archive_batch(a, sorted(e["date_generale"]["cui"] for e in found), date(2026, 11, 2), anaf_response(found, []), at(2026, 11, 2, 8))


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    write_aep(a)
    write_mf(a)
    write_seap(a)
    write_anaf(a)


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
