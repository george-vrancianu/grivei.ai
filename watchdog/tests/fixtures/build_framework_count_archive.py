"""Builds `archive-framework-count/`, the raw-archive fixture for the framework's subsequent-contract count (ticket #254). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_framework_count_archive.py

Every name, code and CUI is invented. One Contracte 2023 T1 file (the 2022 pipe CSV, shaped like the real export, as in the counting archive),
one authority, three framework agreements whose subsequent contracts sit under the agreement's award notice:
  CAN9830001  framework 100,000,000 RON + 51 subsequent contracts (numbers 2..52): over the 50 the Record page lists
  CAN9830002  framework 100,000,000 RON + exactly 50 subsequent contracts (numbers 2..51)
  CAN9830003  framework 100,000,000 RON + 49 subsequent contracts (numbers 2..50)
Each subsequent contract's value is distinct inside its framework and NOT in the order of its number, so "largest value first" is checkable:
contract n is worth ((n * 37) mod 51 + 1) x 10,000 RON for the first, and the same for the others (37 is coprime to 51: no ties).
The title carries no notice code, so a free-text search for the notice code can only match through the public code.
Codes collide with no other fixture (CAN983xxxxx is unused elsewhere).
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))

from pipeline.archive import Archive  # noqa: E402

OUT = Path(__file__).parent / "archive-framework-count"

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")
FW, SUB = "Cu acord cadru", "Cu acord cadru subsecvent"
AUTHORITY, AUTHORITY_CUI = "SPITALUL CADRU EXEMPLU", "1000025"
WINNER, WINNER_CUI = "ALFA DEMO SRL", "2000007"


def row(notice: str, number: int, title: str, value: int, by: str) -> str:
    return (f"|{AUTHORITY}|,|{AUTHORITY_CUI}|,|RO113|,|Cluj|,|Licitatie deschisa|,|{by}|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
            f"|02/10/2023|,|1|,|{number}|,|{title}|,|02/20/2023|,{value},{value},|{WINNER}|,| {WINNER_CUI}|")


def framework(notice: str, subsequent: int) -> list[str]:
    rows = [row(notice, 1, "Acord cadru de medicamente", 100_000_000, FW)]
    for n in range(2, subsequent + 2):
        rows.append(row(notice, n, f"Contract subsecvent {n}", ((n * 37) % 51 + 1) * 10_000, SUB))
    return rows


CONTRACTS = [*framework("CAN9830001", 51), *framework("CAN9830002", 50), *framework("CAN9830003", 49)]


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    contracts = "\n".join([H22, *CONTRACTS]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=datetime(2023, 6, 20, 9, 0, tzinfo=timezone.utc),
                 files={"raport-contracte-t1-2023.csv": contracts.encode()}, via="Contracte 2023 - T1",
                 url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
