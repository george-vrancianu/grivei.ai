"""Builds `archive-counting/`, the raw-archive fixture for the counting rule (ticket #65). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_counting_archive.py

Every name, code, CUI and CNP is invented. The SEAP files are shaped like the real data.gov.ro exports (pipe CSV, `|text|`
fields, MM/DD/YYYY dates), as in the identity fixture; the estimated-value answers are shaped like e-licitatie's notice list
and written through the connector's own `archive_answer`.

One Record per case; seam 1 and the DB tests read them (the expected Total is worked out in `seam1.test.ts`):

DA 2023 T1 (the cap is read at the award date, 10x the cap is suspect):
  DA94000001  2,000,000 RON on 2022-05-10 (old caps)         suspect
  DA94000002  1,350,599 RON on 2022-05-10                     just below 10x the old cap: counted
  DA94000003  2,000,000 RON on 2022-09-09                     last day of the old caps: suspect
  DA94000004  2,000,000 RON on 2022-09-10                     first day of the new caps: counted
  DA94000005  2,701,200 RON on 2023-01-15                     exactly 10x the new cap: suspect
  DA94000006  5,000,000 RON, CPV 45 (works)                   below 10x the works cap 900,400: counted
  DA94000007  9,100,000 RON, CPV 45 (works)                   suspect
  DA94000008  50,000,000 RON, CPV 70 (rent)                   exempt: counted
  DA94000009  blank value                                     no value in SEAP
  DA94000010  zero value                                      no value in SEAP
Contracte 2023 T1 (the 2022 pipe CSV; subsequent contracts sit under the framework's award notice, as in the real files):
  CAN9800001  framework 10,000,000 RON + subsequent 4,000,000 and 1,000,000       ratio 0.5
  CAN9800002  two framework contracts (6,000,000 + 4,000,000) + subsequent 2,500,000
  CAN9800003  a subsequent contract whose framework is not in the archive (700,000)
  CAN9800004  a contract concluded without a framework (300,000)
  CAN9800005  a framework with a blank ceiling + subsequent 500,000                ratio null
  CAN9800006  1,000 RON won by a company, a natural person and a foreign firm      33334 + 33333 + 33333 bani
  CAN9800007  2,000 RON won by two companies                                       an exact split
  CAN9810001..7  contracts of 1 bn RON or more, with an archived estimate-lookup answer (or none), see MEGA below
"""
from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))

from pipeline.archive import Archive  # noqa: E402
from pipeline.estimates import archive_answer  # noqa: E402

OUT = Path(__file__).parent / "archive-counting"
CNP = "2950202123456"  # invented: a natural person, never stored


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")
COMUNA = ("COMUNA EXEMPLU (PRIMARIA COMUNEI EXEMPLU,JUDETUL TEST)", "1000009")
SPITAL = ("SPITALUL EXEMPLU", "1000017")
PAPER, WORKS, RENT = ("30197000-6", "Articole de papetarie (Rev.2)"), ("45233120-6", "Lucrari de constructii de drumuri (Rev.2)"), ("70220000-9", "Servicii de inchiriere (Rev.2)")


def da_row(code, award, value, cpv, supplier):
    y, m, d = award.split("-")
    return (f"|{code}|,|03/20/2023|,|Oferta acceptata|,|{COMUNA[0]}|,|{COMUNA[1]}|,|Achizitie {code}|,|{cpv[0]}|,|{cpv[1]}|,"
            f"|{m}/{d}/{y}|,{value},{value},|{supplier}|,|2000007|")


DA = [
    ("DA94000001", "2022-05-10", "2000000", PAPER), ("DA94000002", "2022-05-10", "1350599", PAPER), ("DA94000003", "2022-09-09", "2000000", PAPER),
    ("DA94000004", "2022-09-10", "2000000", PAPER), ("DA94000005", "2023-01-15", "2701200", PAPER), ("DA94000006", "2023-01-16", "5000000", WORKS),
    ("DA94000007", "2023-01-16", "9100000", WORKS), ("DA94000008", "2023-01-17", "50000000", RENT), ("DA94000009", "2023-01-18", "", PAPER),
    ("DA94000010", "2023-01-18", "0", PAPER),
]

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")
FW, SUB, NONE = "Cu acord cadru", "Cu acord cadru subsecvent", "Fara acord cadru"
ALFA, BETA = ("ALFA DEMO SRL", "2000007"), ("BETA DEMO SRL", "2000015")


def c22(notice, number, value, by, *suppliers):
    """One contract: a row per winner (the value is repeated on each, as in the files)."""
    return [(f"|{SPITAL[0]}|,|{SPITAL[1]}|,|RO113|,|Cluj|,|Licitatie deschisa|,|{by}|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
             f"|02/10/2023|,|1|,|{number}|,|Contract {notice} {number}|,|02/20/2023|,{value},{value},|{name}|,| {cui}|") for name, cui in suppliers]


CONTRACTS = [
    *c22("CAN9800001", "1", 10_000_000, FW, ALFA), *c22("CAN9800001", "2", 4_000_000, SUB, ALFA), *c22("CAN9800001", "3", 1_000_000, SUB, ALFA),
    *c22("CAN9800002", "1", 6_000_000, FW, ALFA), *c22("CAN9800002", "2", 4_000_000, FW, BETA), *c22("CAN9800002", "3", 2_500_000, SUB, BETA),
    *c22("CAN9800003", "1", 700_000, SUB, ALFA),
    *c22("CAN9800004", "1", 300_000, NONE, BETA),
    *c22("CAN9800005", "1", "", FW, ALFA), *c22("CAN9800005", "2", 500_000, SUB, ALFA),
    *c22("CAN9800006", "1", 1_000, NONE, ALFA, ("IONESCU MARIA FICTIV", CNP), ("BALKAN TRADING OOD", "BG103029862")),
    *c22("CAN9800007", "1", 2_000, NONE, ALFA, BETA),
    # 1 bn RON or more: the answer archived for the notice decides (see MEGA)
    *c22("CAN9810001", "1", 1_200_000_000, NONE, ALFA), *c22("CAN9810002", "1", 2_000_000_000, NONE, ALFA), *c22("CAN9810003", "1", 1_000_000_000, NONE, BETA),
    *c22("CAN9810004", "1", 60_000_000_000, NONE, BETA), *c22("CAN9810005", "1", 3_000_000_000, NONE, ALFA), *c22("CAN9810006", "1", 4_000_000_000, NONE, ALFA),
    *c22("CAN9810007", "1", 70_000_000_000, NONE, ALFA),
]

# notice -> the notice list's answer (None: never looked up). The rows have the fields of the real answer.
MEGA = {
    "CAN9810001": "10000000,00 RON",   # 120x its estimate: suspect
    "CAN9810002": "1500000000,00 RON",  # 1.33x: counted
    "CAN9810003": "10000000,00 RON",   # exactly 100x: suspect
    "CAN9810004": "0,00 RON",          # no estimate and above 50 bn: suspect
    "CAN9810005": "",                  # looked up, no such row: no estimate, below 50 bn: counted
    "CAN9810006": None,                # never looked up: counted, noted estimate:not_fetched
    "CAN9810007": None,                # never looked up, above 50 bn: still counted (the rule needs the lookup)
}


def answer(code: str, estimate: str) -> bytes:
    items = [] if estimate == "" else [{
        "caNoticeId": 100258822, "noticeId": 100300001, "noticeNo": code, "sysNoticeTypeId": 3, "sysNoticeVersionId": 2, "procedureId": 100144407,
        "contractTitle": f"Contract {code}", "ronContractValue": 1.0, "estimatedValueExport": estimate, "currencyCode": "RON",
        "hasSubsequentContracts": False, "noticeStateDate": "2023-02-10T10:00:00+02:00"}]
    return json.dumps({"items": items, "total": len(items), "searchTooLong": False}, ensure_ascii=False, separators=(",", ":")).encode()


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    da = "\n".join([DA_HEADER, *(da_row(code, day, value, cpv, "SANTIERUL DEMO SRL") for code, day, value, cpv in DA)]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2023Q1", fetched_at=at(2023, 6, 15), files={"raport-achizitii-directe-t1-2023.csv": da.encode()},
                 via="Achizitii directe 2023 - T1", url="https://data.gov.ro/fixture/raport-achizitii-directe-t1-2023.csv")
    contracts = "\n".join([H22, *CONTRACTS]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2023, 6, 20), files={"raport-contracte-t1-2023.csv": contracts.encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")
    for code, estimate in MEGA.items():
        if estimate is not None:
            archive_answer(a, code, answer(code, estimate), at(2026, 11, 10))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
