"""Builds `archive-contracts/`, the raw-archive fixture for the Contracte and "fara anunt" loader (ticket #64). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_contracts_archive.py

Every name, code and CUI is invented. The files are shaped like the real data.gov.ro exports: the 2021 T3 upper-case CSV,
the 2022 T1 pipe CSV (`|text|` fields), the 2025 XLSX (two `Data publicare` columns, numeric CUIs, datetime cells) and the
2025 "fara anunt" XLSX (a header with a trailing space). The output is committed, so tests and seam 1 read it as it is.

What it holds, by contract:
- CAN9000001 / C-100: three lots with the same value (repeated on every lot and on the second winner's row) -> counts once;
- CAN9000002 / 77/2022: two lots with different values -> the lots sum; winners in a published order that is not alphabetical;
- CAN9000003 / 5: in 2022 T1 (published 2022-03-10), again in 2022 T2 with a newer notice version (2022-05-20, new value and
  winner), and the old 2022 T1 file re-fetched last with other content: the newer version must survive;
- CAN9000010: a framework (`Cu acord cadru`) and its subsequent contracts in the 2025 XLSX, one number holding a `/`;
- CAN9000020 in 2021 T3: no value, a foreign supplier, a multi-line title; a 2023 T1 file with unknown headers (quarantined);
- fara anunt 2025 T1: notice CAN9100001 with two contracts (values add) and CAN9100002 with two winners on one contract.
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))

from openpyxl import Workbook  # noqa: E402

from pipeline.archive import Archive  # noqa: E402

OUT = Path(__file__).parent / "archive-contracts"


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def unit(archive, kind, quarter, fetched, name, data, via):
    archive.write_unit(source="seap", stream="bulk", kind=kind, unit=quarter, fetched_at=fetched, files={name: data}, via=via,
                       url=f"https://data.gov.ro/fixture/{name}")


# ---- 2022: the pipe CSV -----------------------------------------------------------------------------------------------

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")


def row22(notice, published, lot, number, title, value, supplier, cui, signed="12/27/2021", by="Fara acord cadru", authority="SPITALUL EXEMPLU"):
    return (f"|{authority}|,|1000001|,|RO113|,|Cluj|,|Licitatie deschisa|,|{by}|,|Online|,|CN9900001|,|09/20/2021|,|{notice}|,|{published}|,"
            f"|{lot}|,|{number}|,|{title}|,|{signed}|,{value},{value},|{supplier}|,| {cui}|")


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    # 2021 T3: the upper-case CSV with 36 columns (most ignored). A contract with no value, a foreign supplier (a long
    # foreign id as CUI), a multi-line quoted title, a date written M/D/YYYY. Fetched when it was current: 2021-12-01.
    h21 = ("CASTIGATOR,CASTIGATOR_CUI,CASTIGATOR_TARA,CASTIGAOR_LOCALITATE,CASTIGATOR_ADRESA,TIP_ANUNT,TIP_CONTRACT,TIP_PROCEDURA,"
           "AUTORITATE_CONTRACTANTA,AUTORITATE_CONTRACTANTA_CUI,TIP_AUTORITATE,TIP__ACTIVITATE_AUTORITATE,NUMAR_ANUNT_ATRIBUIRE,"
           "DATA_ANUNT_ATRIBUIRE,TIP_INCHEIERE_CONTRACT,MODALITATE_CONTRACTARE,TIP_CRITERII_ATRIBUIRE,CU_LICITATIE_ELECTRONICA,NUMAR_OFERTE,"
           "SUBCONTRACTAT,NUMAR_CONTRACT,DATA_CONTRACT,TITLU_CONTRACT,VALOARE_CONTRACT_RON,CPV_CODE_ID,CPV_CODE,NUMAR_ANUNT_PARTICIPARE,"
           "DATA_ANUNT_PARTICIPARE,VALOARE_ESTIMATA_PARTICIPARE,MONEDA_VALOARE_ESTIMATA,FONDURI_COMUNITARE,TIP_FINANTARE,TIP_LESIGLATIE,"
           "FOND_EUROPEAN,DEPOZITE_GARANTII,MODALITATI_FINANTARE\n")

    def row21(supplier, cui, country, notice, published, number, title, value, by="Fara acord cadru"):
        return (f'"{supplier}","{cui}","{country}","NA","Strada Exemplu 1","Anunt de atribuire","Lucrari","Licitatie deschisa",'
                f'"COMUNA EXEMPLU","1000002","Comuna","Servicii generale","{notice}","{published}","Un contract de achizitii publice","{by}",'
                f'"Pretul cel mai scazut","NU",3,"NU","{number}","09/16/2021","{title}",{value},15937,"45223300-9","CN9900002","07/26/2021",'
                f'226475,"RON","NU","Fonduri bugetare","Legea nr. 98","",,"Garantie de participare 1%"\n')

    d21 = "﻿" + h21 + (
        row21("DEMO BUILD SRL", "2000001", "Romania", "CAN9000020", "10/01/2021", "36181", "Lot 1 – Furtunuri\npt. autospeciale", "") +
        row21("ITALIA COSTRUZIONI SRL", "2461490647", "Italy", "CAN9000021", "10/04/2021", "43", "Parcari subterane", "84479"))
    unit(a, "contracte", "2021Q3", at(2021, 12, 1), "raport-contracte-t3.csv", d21.encode(), "Contracte 2021 - T3")

    # 2022 T1: lots, winners, an exact duplicate row, a framework. C-100 has three lots of 1,000 RON: the value is repeated
    # on every lot row and on the second winner of lot 1. 77/2022 has two lots of different value; its winners come BETA first.
    q1 = [H22,
          row22("CAN9000001", "01/05/2022", 1, "C-100", "Mobilier scolar", 1000, "ALFA MOBILA SRL", "2000001"),
          row22("CAN9000001", "01/05/2022", 1, "C-100", "Mobilier scolar", 1000, "GAMMA LEMN SRL", "2000003"),
          row22("CAN9000001", "01/05/2022", 2, "C-100", "Mobilier scolar", 1000, "ALFA MOBILA SRL", "2000001"),
          row22("CAN9000001", "01/05/2022", 3, "C-100", "Mobilier scolar", 1000, "ALFA MOBILA SRL", "2000001"),
          row22("CAN9000001", "01/05/2022", 1, "C-100", "Mobilier scolar", 1000, "ALFA MOBILA SRL", "2000001"),  # exact duplicate
          row22("CAN9000002", "02/11/2022", 1, "77/2022", "Reactivi laborator", 500, "BETA CHIMIE SRL", "2000002", by="Cu acord cadru"),
          row22("CAN9000002", "02/11/2022", 2, "77/2022", "Reactivi laborator", 700.25, "ALFA CHIMIE SRL", "2000001", by="Cu acord cadru"),
          row22("CAN9000003", "03/10/2022", 1, "5", "Combustibil", 100, "PETROL DEMO SA", "2000004")]
    unit(a, "contracte", "2022Q1", at(2022, 6, 15), "raport-contracte-t1-2022.csv", ("\n".join(q1) + "\n").encode(), "Contracte 2022 - T1")

    # 2022 T2: CAN9000003 / 5 again, with a newer notice publication: value, title and winner changed.
    q2 = [H22, row22("CAN9000003", "05/20/2022", 1, "5", "Combustibil (actualizat)", 150, "PETROL NOU SA", "2000005"),
          row22("CAN9000004", "06/02/2022", 1, "9", "Servicii de curatenie", 40, "CURAT EXEMPLU SRL", "2000006")]
    unit(a, "contracte", "2022Q2", at(2022, 9, 15), "raport-contracte-t2-2022.csv", ("\n".join(q2) + "\n").encode(), "Contracte 2022 - T2")

    # the old 2022 T1 file fetched AGAIN, last, with other content: CAN9000003 / 5 as it was before the update (value 999).
    # The newer version from the 2022 T2 file must stay.
    q1b = [H22, row22("CAN9000003", "03/10/2022", 1, "5", "Combustibil (vechi, reincarcat)", 999, "PETROL DEMO SA", "2000004")]
    unit(a, "contracte", "2022Q1", at(2023, 1, 10), "raport-contracte-t1-2022.csv", ("\n".join(q1b) + "\n").encode(), "Contracte 2022 - T1")

    # 2023 T1: headers nobody knows. Quarantined whole; CAN9000099 must never load.
    unit(a, "contracte", "2023Q1", at(2023, 6, 15), "raport-contracte-t1-2023.csv", b"NR,DATA,SUMA\nCAN9000099,01/01/2023,10\n", "Contracte 2023 - T1")

    # 2025 T1 XLSX: two `Data publicare` columns (the initiation notice's, then the award notice's), numeric CUIs, datetime
    # cells, a framework and its subsequent contracts (one number holds a `/`), a text CUI with RO, a mangled CUI.
    wb = Workbook()
    ws = wb.active
    ws.append(["Autoritate contractanta", "CUI autoritate contractanta", "Tip anunt", "Tip procedura", "Numar anunt initiere", "Data publicare",
               "Tip legislatie", "Tip incheiere contract", "Tip contract", "Tip criterii de atribuire", "Cod CPV", "Denumire CPV", "Numar lot",
               "Numar anunt atribuire", "Data publicare", "Data contract", "Numar contract", "Incheiat prin", "Valoare contract (RON)",
               "Ofertant castigator", "CUI ofertant castigator"])
    d = datetime

    def x(notice, published, lot, number, by, value, supplier, cui, signed=d(2025, 1, 20)):
        ws.append(["MUNICIPIUL EXEMPLU", 4267117, "Anunt de atribuire", "Licitatie deschisa", "CN9900010", d(2024, 10, 12, 1, 38, 16),
                   "Legea nr. 98/23.05.2016", "Incheierea unui acord-cadru", "Servicii", "Pretul cel mai scazut", "50720000-8",
                   "Servicii de reparare si de intretinere a incalzirii centrale (Rev.2)", lot, notice, published, signed, number, by, value,
                   supplier, cui])

    x("CAN9000010", d(2025, 1, 2, 13, 0, 48), 1, "21", "Cu acord cadru", 2833241, "UTI FACILITY SA", 18165761, d(2025, 1, 10))
    x("CAN9000010", d(2025, 1, 2, 13, 0, 48), 1, "133", "Cu acord cadru subsecvent", 621836.5, "UTI FACILITY SA", "RO 18165761")
    x("CAN9000010", d(2025, 1, 2, 13, 0, 48), 1, "1398514/1", "Cu acord cadru subsecvent", 289637, "UTI FACILITY SA", 18165761)
    x("CAN9000011", d(2025, 2, 3, 9, 0), 1, "A 7", "Fara acord cadru", 50000, "Chronos Travel", "1.00761E+12")
    wb.save(OUT / "_tmp.xlsx")
    unit(a, "contracte", "2025Q1", at(2025, 6, 20), "datagov_raport_contracte_t1_2025.xlsx", (OUT / "_tmp.xlsx").read_bytes(), "Contracte 2025 - T1")

    # "fara anunt de initiere" 2025 T1: no lots. CAN9100001 has two contracts (values add); CAN9100002 one contract with two winners
    # (the value is repeated on both rows and counts once). The supplier header has a trailing space, as in the real file.
    wb = Workbook()
    ws = wb.active
    ws.append(["Autoritate contractanta", "CUI autoritate contractanta", "Tip anunt", "Tip procedura", "Numar anunt atribuire", "Data publicare",
               "Tip legislatie", "Incheiat prin", "Tip contract", "Criteriu de atribuire", "Cod CPV", "Denumire CPV", "Data contract",
               "Numar contract", "Denumire contract", "Valoare atribuita (RON)", "Ofertant castigator ", "CUI ofertant castigator"])

    def y(notice, published, number, title, value, supplier, cui):
        ws.append(["CENTRUL MEDICAL EXEMPLU", 13641538, "Anunt de atribuire", "Norme proprii (Anexa 2B)", notice, published,
                   "Legea nr. 98/23.05.2016", "Fara acord cadru", "Servicii", "Pretul cel mai scazut", "85147000-1",
                   "Servicii de medicina muncii (Rev.2)", d(2024, 11, 11), number, title, value, supplier, cui])

    y("CAN9100001", d(2025, 1, 3, 8, 52, 22), 1398423, "Servicii medicale lot 10", 35192.12, "CLINICA DEMO SRL", 11963146)
    y("CAN9100001", d(2025, 1, 3, 8, 52, 22), "1398514/1", "Contract subsecvent 2", 288.46, "CLINICA DEMO SRL", 11963146)
    y("CAN9100002", d(2025, 1, 3, 9, 15, 54), 77, "Servicii medicale lot 9", 98800, "CENTRUL TOPMED DEMO", "RO 6781938")
    y("CAN9100002", d(2025, 1, 3, 9, 15, 54), 77, "Servicii medicale lot 9", 98800, "ASOCIEREA DEMO", 5555555)
    wb.save(OUT / "_tmp2.xlsx")
    unit(a, "fara-anunt", "2025Q1", at(2025, 6, 20), "datagov_raport_anunturi-fara-anunt_t1_2025.xlsx", (OUT / "_tmp2.xlsx").read_bytes(),
         "Anunturi de atribuire la proceduri fara anunt de initiere T1 2025")
    (OUT / "_tmp.xlsx").unlink()
    (OUT / "_tmp2.xlsx").unlink()


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
