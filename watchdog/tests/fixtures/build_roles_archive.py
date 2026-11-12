"""Builds `archive-roles/`, the raw-archive fixture of the entity role fields (ticket #73). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_roles_archive.py

Every name, code, CUI and CNP is invented (CUIs have valid check digits). Three entities of interest:

  SPITALUL EXEMPLU     1000017  an authority only: buys from everybody below
  CNAIR DEMO SA        2000031  BOTH roles: wins from the hospital and buys from ALFA and BETA
  ALFA DEMO SRL        2000007  a supplier only; BETA DEMO SRL 2000015; GAMMA DEMO SRL 2000023
  (ANAF confirms the four companies: a supplier is CUI-keyed only then)
  COMUNA EXEMPLU       1000009  a second authority (an authority-only entity that shares suppliers with the hospital)

DA 2023 T1 (direct purchases, no procedure):
  DA96000001  hospital -> ALFA   2023-01-10  100,000 RON
  DA96000002  hospital -> ALFA   2023-02-12   50,000
  DA96000003  hospital -> BETA   2023-02-20   30,000
  DA96000004  hospital -> ALFA   2023-03-05   blank value
  DA96000005  hospital -> ALFA   2023-03-06   2,701,200 (exactly 10x the cap: suspect, left out)
  DA96000006  hospital -> CNAIR  2023-01-20   20,000
  DA96000007  CNAIR    -> ALFA   2023-02-01   40,000
  DA96000008  hospital -> a natural person 2023-02-03 15,000
DA 2024 T1:
  DA96100001  hospital -> ALFA   2024-01-15   25,000
  DA96100002  comuna   -> BETA   2024-02-20   35,000
Contracte 2023 T1 (hospital unless said; DATA_CONTRACT is the award date):
  CAN9600001  framework 10,000,000 (ALFA, "Licitatie deschisa") + subsequent 4,000,000 and 1,000,000  2023-01-25
  CAN9600002  900,000 consortium ALFA + BETA + GAMMA (300,000 each), "Negociere"                        2023-02-10
  CAN9600003  comuna, 700,000 consortium ALFA + BETA (350,000 each), "Licitatie deschisa"             2023-02-14
  CAN9600004  600,000 consortium BETA + a natural person (300,000 each), "Negociere"                    2023-03-02
  CAN9600005  100,000 consortium ALFA + BETA (50,000 each), "Licitatie deschisa"                       2023-03-15
  CAN9600006  2,000,000 won by CNAIR, "Licitatie deschisa"                                              2023-01-25
  CAN9600007  CNAIR buys: 300,000 from BETA, "Licitatie deschisa"                                        2023-02-15
  CAN9600008  blank value, ALFA, "Negociere"                                                           2023-03-20
"""
from __future__ import annotations

import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
WATCHDOG = HERE.parents[1]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(HERE))

from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = Path(__file__).parent / "archive-roles"
CNP = "2950202123456"  # invented: a natural person, never stored

SPITAL = ("SPITALUL EXEMPLU", "1000017")
COMUNA = ("COMUNA EXEMPLU", "1000009")
CNAIR = ("CNAIR DEMO SA", "2000031")
ALFA, BETA, GAMMA = ("ALFA DEMO SRL", "2000007"), ("BETA DEMO SRL", "2000015"), ("GAMMA DEMO SRL", "2000023")
PERSON = ("IONESCU MARIA FICTIV", CNP)


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")


def da(code, award, value, authority, supplier):
    y, m, d = award.split("-")
    return (f"|{code}|,|03/20/{y}|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|Achizitie {code}|,|30197000-6|,|Articole de papetarie (Rev.2)|,"
            f"|{m}/{d}/{y}|,{value},{value},|{supplier[0]}|,|{supplier[1]}|")


H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")


def contract(notice, number, authority, procedure, by, award, value, *winners):
    """One contract: a row per winner (the value is repeated on each, as in the files)."""
    y, m, d = award.split("-")
    return [(f"|{authority[0]}|,|{authority[1]}|,|RO113|,|Cluj|,|{procedure}|,|{by}|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
             f"|02/10/2023|,|1|,|{number}|,|Contract {notice} {number}|,|{m}/{d}/{y}|,{value},{value},|{name}|,| {cui}|") for name, cui in winners]


FW, SUB, NONE = "Cu acord cadru", "Cu acord cadru subsecvent", "Fara acord cadru"
OPEN, NEG = "Licitatie deschisa", "Negociere"


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    da23 = [
        da("DA96000001", "2023-01-10", "100000", SPITAL, ALFA), da("DA96000002", "2023-02-12", "50000", SPITAL, ALFA),
        da("DA96000003", "2023-02-20", "30000", SPITAL, BETA), da("DA96000004", "2023-03-05", "", SPITAL, ALFA),
        da("DA96000005", "2023-03-06", "2701200", SPITAL, ALFA), da("DA96000006", "2023-01-20", "20000", SPITAL, CNAIR),
        da("DA96000007", "2023-02-01", "40000", CNAIR, ALFA), da("DA96000008", "2023-02-03", "15000", SPITAL, PERSON),
    ]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15),
                 files={"raport-achizitii-directe-t1-2023.csv": ("\n".join([DA_HEADER, *da23]) + "\n").encode()},
                 via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2023.csv")
    da24 = [da("DA96100001", "2024-01-15", "25000", SPITAL, ALFA), da("DA96100002", "2024-02-20", "35000", COMUNA, BETA)]
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2024Q1", fetched_at=at(2024, 6, 15),
                 files={"raport-achizitii-directe-t1-2024.csv": ("\n".join([DA_HEADER, *da24]) + "\n").encode()},
                 via="Achizitii directe 2024 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2024.csv")
    rows = [
        *contract("CAN9600001", "1", SPITAL, OPEN, FW, "2023-01-25", 10_000_000, ALFA),
        *contract("CAN9600001", "2", SPITAL, OPEN, SUB, "2023-01-25", 4_000_000, ALFA),
        *contract("CAN9600001", "3", SPITAL, OPEN, SUB, "2023-01-25", 1_000_000, ALFA),
        *contract("CAN9600002", "1", SPITAL, NEG, NONE, "2023-02-10", 900_000, ALFA, BETA, GAMMA),
        *contract("CAN9600003", "1", COMUNA, OPEN, NONE, "2023-02-14", 700_000, ALFA, BETA),
        *contract("CAN9600004", "1", SPITAL, NEG, NONE, "2023-03-02", 600_000, BETA, PERSON),
        *contract("CAN9600005", "1", SPITAL, OPEN, NONE, "2023-03-15", 100_000, ALFA, BETA),
        *contract("CAN9600006", "1", SPITAL, OPEN, NONE, "2023-01-25", 2_000_000, CNAIR),
        *contract("CAN9600007", "1", CNAIR, OPEN, NONE, "2023-02-15", 300_000, BETA),
        *contract("CAN9600008", "1", SPITAL, NEG, NONE, "2023-03-20", "", ALFA),
    ]
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2023, 6, 20),
                 files={"raport-contracte-t1-2023.csv": ("\n".join([H22, *rows]) + "\n").encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")
    # ANAF confirms the four companies: a supplier is keyed by its CUI only when ANAF knows it (ADR 0003)
    companies = [ALFA, BETA, GAMMA, CNAIR]
    entries = [anaf_entry(int(cui), name) for name, cui in companies]
    archive_batch(a, [int(cui) for _, cui in companies], date(2026, 11, 2), anaf_response(entries, []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
