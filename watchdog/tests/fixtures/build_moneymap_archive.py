"""Builds `archive-moneymap/`, the raw-archive fixture of the Money lens aggregations (ticket #71). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_moneymap_archive.py

It is the placement fixture (`archive-placement/`, built by `build_placement_archive.py`, which must have been run first; use its
`placement-data/`) plus one Contracte file and one more ANAF answer. Everything is invented. The placement fixture has one DA per
authority, all won by SANTIERUL TARA DEMO SRL (Brasov), among them two national authorities, an unplaced one, a county-only one and
a Bucharest sector. What this adds:

  CAN9800001  authority Sanpetru (BV), 1,000.01 RON, a consortium: SANTIERUL TARA DEMO (Brasov) + CLUJ DEMO CONSTRUCT (Cluj)
              (100,001 bani: shares 50,001 + 50,000, the odd bani to the first winner)
  CAN9800002  authority I.L. Caragiale (CJ), 600 RON, a consortium of CLUJ DEMO CONSTRUCT and a Bulgarian firm (foreign: unknown county)
  CAN9800003  the ministry (national), 5,000 RON, won by SANTIERUL TARA DEMO
  CAN9800004  the unplaced authority, 700 RON, won by a natural person (never stored) and CLUJ DEMO CONSTRUCT
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

from build_identity_archive import H22 as _H22, anaf_entry, anaf_response  # noqa: E402,F401
from build_placement_archive import ANAF, CUI, OUT as PLACEMENT, SEAP_NAMES  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-moneymap"
CNP = "2950202123456"  # invented: a natural person, never stored
CLUJ_FIRM = ("CLUJ DEMO CONSTRUCT SRL", "2000104")


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def row(notice, number, authority, title, value, supplier, cui):
    return (f"|{authority[0]}|,|{authority[1]}|,|RO113|,|Cluj|,|Licitatie deschisa|,|Fara acord cadru|,|Online|,|CN9900001|,|01/20/2023|,|{notice}|,"
            f"|02/10/2023|,|1|,|{number}|,|{title}|,|02/20/2023|,{value},{value},|{supplier}|,| {cui}|")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(PLACEMENT, OUT)
    a = Archive(OUT)
    auth = lambda key: (ANAF[key][0] if key in ANAF else SEAP_NAMES[key], CUI[key])  # noqa: E731
    santier = ("SANTIERUL TARA DEMO SRL", "2000007")
    rows = [
        _H22,
        row("CAN9800001", "1", auth("sanpetru"), "Drum comunal", "1000.01", *santier),
        row("CAN9800001", "1", auth("sanpetru"), "Drum comunal", "1000.01", *CLUJ_FIRM),
        row("CAN9800002", "1", auth("caragiale"), "Scoala", "600", *CLUJ_FIRM),
        row("CAN9800002", "1", auth("caragiale"), "Scoala", "600", "BALKAN TRADING OOD", "BG103029862"),
        row("CAN9800003", "1", auth("ministry"), "Sistem informatic", "5000", *santier),
        row("CAN9800004", "1", auth("unplaced"), "Mobilier", "700", "IONESCU MARIA FICTIV", CNP),
        row("CAN9800004", "1", auth("unplaced"), "Mobilier", "700", *CLUJ_FIRM),
    ]
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2023, 6, 20), files={"raport-contracte-t1-2023.csv": ("\n".join(rows) + "\n").encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")
    entry = anaf_entry(int(CLUJ_FIRM[1]), CLUJ_FIRM[0], locality="Mun. Cluj-Napoca", county="CJ", code="12")
    entry["adresa_sediu_social"]["scod_Postal"] = "400001"
    archive_batch(a, [int(CLUJ_FIRM[1])], date(2026, 11, 2), anaf_response([entry], []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
