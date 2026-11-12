"""Builds `archive-bulk/`, the raw-archive fixture for the DA/DAN loader (ticket #63). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_bulk_archive.py

Every name, code and CUI is invented. The files are shaped like the real data.gov.ro exports (header names, `|text|`
fields, MM/DD/YYYY dates, comma thousands, numeric XLSX cells). The output is committed, so tests and seam 1 read it as
it is; this script only documents how it was made and rebuilds it deterministically (apart from XLSX zip metadata).
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

OUT = Path(__file__).parent / "archive-bulk"


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def unit(archive, kind, quarter, fetched, name, data, via):
    archive.write_unit(source="seap", stream="bulk", kind=kind, unit=quarter, fetched_at=fetched, files={name: data}, via=via,
                       url=f"https://data.gov.ro/fixture/{name}")


DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")


def da_row(code, pub, title, value, award="", supplier="CURAT EXEMPLU SRL", cui="2000001", authority="SCOALA GIMNAZIALA EXEMPLU"):
    return (f"|{code}|,|{pub}|,|Oferta acceptata|,|{authority}|,|1000002|,|{title}|,|30197000-6|,|Articole de papetarie (Rev.2)|,"
            f"|{award}|,{value},{value},|{supplier}|,|{cui}|")


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    # DA 2022 Q1, the real pipe shape. `|` inside fields; a field holding `|,`; an exact duplicate; a repeated code.
    da22 = [DA_HEADER,
            da_row("DA91000001", "03/28/2022", "Hartie A4", "1200.5", "03/30/2022"),
            da_row("DA91000002", "03/29/2022", "Tub PVC 3|4 toli", "300"),
            da_row("DA91000003", "03/30/2022", "Lot A|,B pixuri", "75.25"),
            da_row("DA91000001", "03/28/2022", "Hartie A4", "1200.5", "03/30/2022"),  # exact duplicate
            da_row("DA91000004", "03/31/2022", "Creioane", "40", cui="RO 2000002", supplier="PAPETARIE DEMO SRL")]
    unit(a, "da", "2022Q1", at(2022, 6, 15), "raport-achizitii-directe-t1-2022.csv", ("\n".join(da22) + "\n").encode(), "Achizitii directe 2022 - T1")
    # the very same file fetched again on a later day (a re-upload): changes nothing
    unit(a, "da", "2022Q1", at(2022, 7, 20), "raport-achizitii-directe-t1-2022.csv", ("\n".join(da22) + "\n").encode(), "Achizitii directe 2022 - T1")

    # DA 2023 Q1 with renamed headers (spaces, plain CSV quoting, other spellings). Includes a row of 2022 Q4 by publication date.
    renamed = ("Numar achizitie directa,Data publicare achizitie,Stare achizitie,Denumire autoritate contractanta,CUI autoritate contractanta,"
               "Denumire achizitie,Cod CPV,Denumire CPV,Data atribuire achizitie,Valoare estimata (RON),Valoare atribuita (RON),Ofertant,CUI ofertant\n"
               "DA91000010,02/10/2023,Oferta acceptata,COMUNA EXEMPLU,1000001,Servicii de curatenie,90910000-9,Servicii de curatare (Rev.2),02/12/2023,900,900,CURAT EXEMPLU SRL,2000001\n"
               "DA91000011,12/30/2022,Oferta acceptata,COMUNA EXEMPLU,1000001,Reparatii,45233141-9,Lucrari (Rev.2),,500,450.5,DRUMURI DEMO S.A.,RO2000002\n")
    unit(a, "da", "2023Q1", at(2023, 6, 15), "raport-achizitii-directe-t1-2023.csv", renamed.encode(), "Achizitii directe 2023 - T1")

    # DA 2023 Q2: headers nobody knows. Quarantined whole; DA91000099 must never load.
    unknown = "NUMAR,DATA,SUMA\nDA91000099,04/01/2023,10\n"
    unit(a, "da", "2023Q2", at(2023, 9, 15), "raport-achizitii-directe-t2-2023.csv", unknown.encode(), "Achizitii directe 2023 - T2")

    # DAN 2024 Q1, the real CSV shape: a quoted multi-line title, thousands separators, a bare amount.
    dan_head = ("Autoritate contractanta,CUI ,Numar notificare,Data publicare,Denumire,Cod CPV,Denumire CPV,Tip contract,"
                "Modalitate desfasurare,Valoare atribuita (RON),Fonduri comunitare?,Denumire program,Data atribuire,Ofertant,CUI ofertant\n")
    dan_q1 = (dan_head +
              'COMUNA EXEMPLU (PRIMARIA EXEMPLU),1000001,DAN9100001,01/02/2024 22:03:37,SERVICII VULCANIZARE,50112200-5,Servicii de intretinere a automobilelor (Rev.2),Servicii,Offline,"5,089",Nu,,01/02/2024 22:03:31,S.C. BODIMPEX S.R.L.,8499780\n'
              'COMUNA EXEMPLU (PRIMARIA EXEMPLU),1000001,DAN9100002,01/02/2024 22:06:03,"DISTRIBUITOR HIDRAULIC\nFILTRU HIDRAULIC",42968000-9,Distribuitoare (Rev.2),Furnizare,Offline,435,Nu,,01/02/2024 22:05:59,S.C. FLORIMES S.R.L.,5819066\n')
    unit(a, "dan", "2024Q1", at(2024, 6, 20), "datagov-raport-notificari-t-i-2024.csv", dan_q1.encode(), "Notificari de atribuire la cumpararea directa T I 2024")

    # DAN 2024 Q2: thousands separators with millions; DAN9100002 appears again unchanged (counted once across quarters).
    dan_q2 = (dan_head +
              'SPITAL EXEMPLU,1000003,DAN9100010,04/15/2024 10:00:00,Aparatura medicala,33100000-1,Echipamente medicale (Rev.2),Furnizare,Offline,"1,234,567.50",Nu,,04/15/2024 09:59:00,MEDICAL DEMO S.R.L.,2000010\n'
              'SPITAL EXEMPLU,1000003,DAN9100011,06/30/2024 08:30:00,Consumabile,33100000-1,Echipamente medicale (Rev.2),Furnizare,Offline,"12,000",Nu,,,MEDICAL DEMO S.R.L.,2000010\n'
              'COMUNA EXEMPLU (PRIMARIA EXEMPLU),1000001,DAN9100002,01/02/2024 22:06:03,"DISTRIBUITOR HIDRAULIC\nFILTRU HIDRAULIC",42968000-9,Distribuitoare (Rev.2),Furnizare,Offline,435,Nu,,01/02/2024 22:05:59,S.C. FLORIMES S.R.L.,5819066\n')
    unit(a, "dan", "2024Q2", at(2024, 9, 20), "datagov-raport-notificari-t-ii-2024.csv", dan_q2.encode(), "Notificari de atribuire la cumpararea directa T II 2024")

    # DAN 2025 Q1, XLSX: the 2025 headers, numeric CUIs (int and float cells), a CUI as text with RO, a mangled CUI,
    # date cells and an Excel serial, a numeric amount, a mangled amount.
    wb = Workbook()
    ws = wb.active
    ws.append(["Autoritate contractanta", "CUI autoritate contractanta", "Numar notificare ", "Data publicare", "Obiectul achizitiei",
               "Cod CPV", "Denumire CPV", "Tip contract", "Valoare achizitie (RON)", "Finantare prin fonduri comunitare?",
               "Tipul de proiect/ program", "Data finalizare", "Ofertant castigator", "CUI ofertant castigator"])
    d = datetime
    ws.append(["AGENTIA EXEMPLU", 18308578, "DAN9100020", d(2025, 1, 1, 14, 52), "Achizitie servicii de certificare", "79132100-9",
               "Servicii de certificare (Rev.2)", "Servicii", 373.13, "Nu", None, d(2025, 1, 1, 14, 52), "S.C. TRANS SPED S.A.", 12458924])
    ws.append(["AGENTIA EXEMPLU", 18308578.0, "DAN9100021", d(2025, 1, 1, 14, 56), "Achizitie vinieta", "22453000-0",
               "Viniete de automobile (Rev.2)", "Servicii", 117.05, "Nu", None, 45658.6228, "Barely digital GmbH & Co. KG", "RO46832143"])
    ws.append(["AGENTIA EXEMPLU", 18308578, "DAN9100022", d(2025, 2, 3, 9, 0), "Achizitie cazare", "98341000-5",
               "Servicii de cazare (Rev.2)", "Servicii", "1.5E+3", "Nu", None, d(2025, 2, 3, 9, 0), "Chronos Travel", "1.00761E+12"])
    wb.save(OUT / "_tmp.xlsx")
    unit(a, "dan", "2025Q1", at(2025, 6, 20), "datagov_raport_notificari_t1_2025.xlsx", (OUT / "_tmp.xlsx").read_bytes(),
         "Notificari de atribuire la cumpararea directa T1 2025")
    (OUT / "_tmp.xlsx").unlink()


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
