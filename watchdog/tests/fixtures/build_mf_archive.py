"""Builds `archive-mf/`, the Ministry of Finance list for the placement world (ticket #80). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_mf_archive.py

`archive-mf/` holds ONLY the MF unit (`mf/list/entities/2026-11-01/2026-11-05/lista_ep_portal_01112026.xls`, a small legacy .xls with the real
file's ten columns and ASCII county names); the seam-1 test copies it into a copy of `archive-placement/` (the authorities, their ANAF answers
and award notices are that fixture's, see build_placement_archive.py), so the MF list and the Records meet on the same CUIs.

What the slice shows (CUIs are the placement fixture's, plus invented MF-only ones with valid check digits):
- Brasov: the municipality, two communes and a town (all with Records) plus two entities with none: M 6, N 4. Three authorities that are
  not on the list (the DSP, a commune placed county-only, one placed via SEAP) are "other authorities" of Brasov.
- Cluj: two communes with Records, the unplaced authority (listed here by MF, placed nowhere by us: it is in N of Cluj AND in the Unplaced tile)
  and one entity with none: M 4, N 3. Huedin is not on the list: an "other authority" of Cluj.
- Bucuresti: sector 3's city hall (M 1, N 1); the ministry and the agency are filed under Bucuresti too but are national authorities
  (award notice, reviewed file): they count in NATIONAL, as does an MF-only national entity (a file line the test adds).
- Dambovita and Valcea (MF's ASCII spelling of the two `Â` counties): one entity each, M 1, N 0.
- A row whose Judet is no county (`Strainatate`) and a repeated CIF: kept out of every county's M.
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import xlwt

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(HERE))

from build_placement_archive import CUI, make_cui  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-mf"
FILE = "lista_ep_portal_01112026.xls"
HEADER = ["Judet", "CIF Entitate Publica", "CIF in scop TVA", "Denumire Entitate Publica", "Denumire UAT pe raza careia isi desfasoara activitatea",
          "Adresa de corespondenta", "CIF Ordonator  principal  de credite (1)", "Denumire ordonator  principal de credite (1)",
          "CIF Ordonator  principal  de credite (2)", "Denumire ordonator  principal de credite (2)"]
MF_ONLY = {key: make_cui(body) for key, body in {"bv_school": 5100150, "bv_commune": 5100160, "cj_school": 5100170, "national_only": 5100180}.items()}

ROWS = [
    ("Brasov", CUI["brasov"], "MUNICIPIUL BRASOV", "Municipiul Brasov"),
    ("Brasov", CUI["sanpetru"], "COMUNA SANPETRU", "Comuna Sanpetru"),
    ("Brasov", CUI["rasnov"], "ORAS RASNOV", "Orasul Rasnov"),
    ("Brasov", CUI["sinca"], "COMUNA SINCA NOUA", "Comuna Sinca Noua"),
    ("Brasov", MF_ONLY["bv_school"], "SCOALA GIMNAZIALA FICTIVA BRASOV", "Municipiul Brasov"),
    ("Brasov", MF_ONLY["bv_commune"], "COMUNA TARLUNGENI DEMO", "Comuna Tarlungeni"),
    ("Cluj", CUI["caragiale"], "COMUNA I.L. CARAGIALE", "Comuna I.L. Caragiale"),
    ("Cluj", CUI["apahida"], "COMUNA APAHIDA", "Comuna Apahida"),
    ("Cluj", CUI["unplaced"], "ASOCIATIA FARA ADRESA", "Municipiul Cluj-Napoca"),
    ("Cluj", MF_ONLY["cj_school"], "LICEUL FICTIV CLUJ", "Municipiul Cluj-Napoca"),
    ("Bucuresti", CUI["bucharest3"], "PRIMARIA SECTORULUI 3", "Sectorul 3 al Municipiului Bucuresti"),
    ("Bucuresti", CUI["ministry"], "MINISTERUL EXEMPLULUI", "Sectorul 1 al Municipiului Bucuresti"),
    ("Bucuresti", CUI["agency"], "AGENTIA NATIONALA DEMO", "Sectorul 2 al Municipiului Bucuresti"),
    ("Bucuresti", MF_ONLY["national_only"], "INSTITUTUL NATIONAL FICTIV", "Sectorul 1 al Municipiului Bucuresti"),
    ("Dambovita", make_cui(5100200), "COMUNA FICTIVA DEMO DB", "Comuna Fictiva"),  # MF's ASCII `Dambovita` (the gazetteer's own fold is `DIMBOVITA`)
    ("Valcea", make_cui(5100210), "COMUNA FICTIVA DEMO VL", "Comuna Fictiva"),
    ("Strainatate", make_cui(5100190), "MISIUNEA FICTIVA DIN STRAINATATE", ""),
    ("Brasov", CUI["brasov"], "MUNICIPIUL BRASOV (repeated row)", "Municipiul Brasov"),  # a repeated CIF: dropped
]


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    book = xlwt.Workbook()
    sheet = book.add_sheet("Sheet1")
    for c, h in enumerate(HEADER):
        sheet.write(0, c, h)
    for r, (county, cui, name, uat) in enumerate(ROWS, start=1):
        for c, v in enumerate([county, cui, "", name, uat, f"{county}, {uat}, STRADA DEMO, Numar 1", "", "", "", ""]):
            sheet.write(r, c, v)
    tmp = HERE / "_tmp_mf.xls"
    book.save(str(tmp))
    origin = {"system": "data.gov.ro", "dataset": "listaentitatipublice", "resourceId": "00000000-fixture-0001", "resourceName": "Lista_EP_portal_01112026.xls",
              "url": f"https://data.gov.ro/fixture/{FILE}", "lastModified": "2026-11-06T11:28:26.101125", "size": tmp.stat().st_size, "hash": "", "format": "XLS"}
    Archive(OUT).write_unit(source="mf", stream="list", kind="entities", unit="2026-11-01", fetched_at=datetime(2026, 11, 5, 9, 0, tzinfo=timezone.utc),
                            files={FILE: tmp}, url=origin["url"], via=origin["resourceName"], origin=origin)
    tmp.unlink()


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
