"""Builds `archive-search/`, the raw-archive fixture of the search engine (ticket #68). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_search_archive.py

Every name, code and CUI is invented. A DA file and a Contracte file (the real data.gov.ro shapes, as in the counting fixture),
one Record per matching rule; seam 1 (`explorer/packages/api/test/seam1.test.ts`) and the DB tests read them.

Authorities: COMUNA EXEMPLU (CUI 1000009), SPITALUL EXEMPLU (CUI 1000017), and two name-only ones with the SAME total (a tie).
DA 2023 T1 (award date, value in RON, CPV):
  DA95000001  2023-02-01  100,000  45233140-2  "Reparații străzi Ștefan cel Mare"   winner "ŞANTIER ȚARA S.R.L."       (comma and cedilla forms, dotted legal form)
  DA95000002  2023-02-02    5,000  30197000-6  "Hartie copiator A4"                   winner "PAPETARIE ALFA SA"        (bucket UP_TO_10K)
  DA95000003  2022-05-10  135,060  09134100-8  "Combustibil motorina"                 winner "PETROL BETA SRL"          (exactly the first cap: UP_TO_135K)
  DA95000004  2023-03-01  135,061  09134100-8  "Combustibil benzina"                  winner "PETROL BETA SRL"          (one ban above: UP_TO_270K)
  DA95000005  2023-02-03   50,000  45454000-4  "Servicii deszapezire"                 winner "ZAPADA DEMO SRL"
  DA95000006  2023-02-04   60,000  90620000-9  "Servicii deszapezire drumuri"         winner "ZAPADA DEMO SRL"
  DA95000007  2023-02-05    1,000  90921000-9  "Servicii de dezinsectie"              winner "ZAPADA DEMO SRL"
  DA95000008  2023-02-06   40,000  30197000-6  "Consumabile birou RO1000017"          winner "PAPETARIE ALFA SA"        (a RO CUI in the title; authority = SPITAL)
  DA95000009  2023-02-07   20,000  30197000-6  "Rechizite"                            winner "BIROU ECHIVALENT SRL"     (authority "PRIMARIA ECHIVALENT-A", ties with DA95000010)
  DA95000010  2023-02-08   20,000  30197000-6  "Rechizite scolare"                    winner "BIROU ECHIVALENT SRL"     (authority "PRIMARIA ECHIVALENT-B"; both authorities and both suppliers' sums tie)
  DA95000011  2023-02-09      (blank)  30197000-6  "Fara valoare"                     winner "PAPETARIE ALFA SA"        (no value: in no bucket, adds nothing)
Contracte 2023 T1 (SPITALUL EXEMPLU):
  CAN9500001  contract 1, 1,000 RON, "Servicii deszapezire consortiu", procedure "Licitatie deschisa", 3 winners
              PAPETARIE ALFA SA (also a DA winner), GAMMA CONSORT SRL, DELTA CONSORT SA: shares 333.34 + 333.33 + 333.33
  CAN9500002  contract 1, 7,000 RON, "Lucrari reparatii", procedure "Negociere", winners ŞANTIER ȚARA S.R.L. and a natural person (never named)
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))

from pipeline.archive import Archive  # noqa: E402

OUT = Path(__file__).parent / "archive-search"
CNP = "2950202123456"  # invented: a natural person, never stored


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")
COMUNA = ("COMUNA EXEMPLU (PRIMARIA COMUNEI EXEMPLU,JUDETUL TEST)", "1000009")
SPITAL = ("SPITALUL EXEMPLU", "1000017")
ECH_A, ECH_B = ("PRIMARIA ECHIVALENT-A", "1234567"), ("PRIMARIA ECHIVALENT-B", "7654321")  # CUIs that fail the check digit: name-only keys
CPV_DESC = {"45233140-2": "Lucrari de drumuri", "30197000-6": "Articole de papetarie", "09134100-8": "Motorina", "45454000-4": "Lucrari de restructurare",
            "90620000-9": "Servicii de deszapezire", "90921000-9": "Servicii de dezinsectie"}


def da(code, award, value, cpv, title, supplier, authority, supplier_cui="2000007"):
    y, m, d = award.split("-")
    return (f"|{code}|,|03/20/2023|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|{title}|,|{cpv}|,|{CPV_DESC[cpv]}|,"
            f"|{m}/{d}/{y}|,{value},{value},|{supplier}|,|{supplier_cui}|")


SANTIER, PAPETARIE, PETROL, ZAPADA, BIROU = "ŞANTIER ȚARA S.R.L.", "PAPETARIE ALFA SA", "PETROL BETA SRL", "ZAPADA DEMO SRL", "BIROU ECHIVALENT SRL"
DA = [
    da("DA95000001", "2023-02-01", "100000", "45233140-2", "Reparații străzi Ștefan cel Mare", SANTIER, COMUNA),
    da("DA95000002", "2023-02-02", "5000", "30197000-6", "Hartie copiator A4", PAPETARIE, COMUNA),
    da("DA95000003", "2022-05-10", "135060", "09134100-8", "Combustibil motorina", PETROL, COMUNA),
    da("DA95000004", "2023-03-01", "135061", "09134100-8", "Combustibil benzina", PETROL, COMUNA),
    da("DA95000005", "2023-02-03", "50000", "45454000-4", "Servicii deszapezire", ZAPADA, COMUNA),
    da("DA95000006", "2023-02-04", "60000", "90620000-9", "Servicii deszapezire drumuri", ZAPADA, COMUNA),
    da("DA95000007", "2023-02-05", "1000", "90921000-9", "Servicii de dezinsectie", ZAPADA, COMUNA),
    da("DA95000008", "2023-02-06", "40000", "30197000-6", "Consumabile birou RO1000017", PAPETARIE, SPITAL),
    da("DA95000009", "2023-02-07", "20000", "30197000-6", "Rechizite", BIROU, ECH_A),
    da("DA95000010", "2023-02-08", "20000", "30197000-6", "Rechizite scolare", BIROU, ECH_B),
    da("DA95000011", "2023-02-09", "", "30197000-6", "Fara valoare", PAPETARIE, COMUNA),
]

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")


def contract(notice, number, title, value, procedure, *suppliers):
    return [(f"|{SPITAL[0]}|,|{SPITAL[1]}|,|RO113|,|Cluj|,|{procedure}|,|Fara acord cadru|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
             f"|02/10/2023|,|1|,|{number}|,|{title}|,|02/20/2023|,{value},{value},|{name}|,| {cui}|") for name, cui in suppliers]


CONTRACTS = [
    *contract("CAN9500001", "1", "Servicii deszapezire consortiu", 1000, "Licitatie deschisa", (PAPETARIE, "2000007"), ("GAMMA CONSORT SRL", "2000015"), ("DELTA CONSORT SA", "2000023")),
    *contract("CAN9500002", "1", "Lucrari reparatii", 7000, "Negociere", (SANTIER, "2000031"), ("IONESCU MARIA FICTIV", CNP)),
]


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15), files={"raport-achizitii-directe-t1-2023.csv": ("\n".join([DA_HEADER, *DA]) + "\n").encode()},
                 via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2023.csv")
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2023, 6, 20), files={"raport-contracte-t1-2023.csv": ("\n".join([H22, *CONTRACTS]) + "\n").encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
