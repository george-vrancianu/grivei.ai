"""Builds `archive-framework-overrun/`, the raw-archive fixture of the `framework-overrun` Signal rule (ticket #76). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_framework_overrun_archive.py

Contracte only (2022 pipe CSV; a 2020 Q4 file for the pre-2021 case). Every name, code and CUI is invented (the roles fixture's entities; ANAF
confirms the suppliers). A framework is an award notice: its framework contract(s) ("Cu acord cadru") and its call-offs ("Cu acord cadru
subsecvent") share the notice number. Amounts in RON; S = SPITALUL EXEMPLU, C = COMUNA EXEMPLU, N = CNAIR DEMO SA.

  CAN9700001  S, ALFA   ceiling 1,000,000 on 2023-01-10; call-offs 600,000 (02-01), 400,000 (02-15), 200,000 (03-05), 50,000 (03-20)
                        crossing: 1,200,000 > 1,100,000 on 2023-03-05; the 03-20 call-off comes after it: ratio 1.25, 4 Records
  CAN9700002  S, BETA   ceiling 1,000,000 on 2023-01-12; ONE call-off of exactly 1,100,000 (02-20): exactly 110%, no Signal
  CAN9700003  C, ALFA   ceiling 1,000,000 on 2023-01-15; call-offs 600,000 and 300,000: 90%, no Signal
  CAN9700004  C, ALFA   a BLANK ceiling on 2023-01-20; call-off 5,000,000 (02-10): no ceiling, never triggers
  CAN9700005  N, ALFA   ceiling 1,000,000 on 2020-11-10 (the 2020 Q4 file); call-offs 1,500,000 in 2023: a pre-2021 framework, no Signal
  CAN9700006  N         two ceilings (ALFA 600,000 on 2023-01-05, BETA 400,000 on 2023-01-08) summed to 1,000,000; call-offs BETA 700,000 (02-01)
                        and GAMMA 500,000 (02-20) cross at 1,200,000 on 02-20: three suppliers, so the filter has no supplier
  CAN9700007  S, BETA   ceiling 1,000,000 on 2023-01-15; call-off 1,200,000 on 02-20: a second Signal of S overlapping CAN9700001's dates; the supplier
                        key (BETA / ALFA) is what tells their filters apart, so they do not collide
  CAN9700008  C, GAMMA  ceiling 500,000 on 2023-01-02; call-offs 300,000 (01-25) and 270,000 (02-05): 114% on 02-05; the one with a consortium
                        (ALFA and GAMMA) call-off
"""
from __future__ import annotations

import shutil
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
sys.path.insert(0, str(HERE))

from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from build_roles_archive import ALFA, BETA, CNAIR, COMUNA, FW, GAMMA, H22, SPITAL, SUB, at  # noqa: E402
from build_signals_archive import contract  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-framework-overrun"
S, C, N = SPITAL, COMUNA, CNAIR


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    def contracte(unit, fetched, rows, label):
        a.write_unit(source="seap", stream="bulk", kind="contracte", unit=unit, fetched_at=fetched,
                     files={f"raport-contracte-{label}.csv": ("\n".join([H22, *rows]) + "\n").encode()},
                     via=f"Contracte {label}", url=f"https://data.gov.ro/fixture/raport-contracte-{label}.csv")

    contracte("2023Q1", at(2023, 6, 20), [
        *contract("CAN9700001", "1", S, "Licitatie deschisa", FW, "2023-01-10", 1_000_000, ALFA),
        *contract("CAN9700001", "2", S, "Licitatie deschisa", SUB, "2023-02-01", 600_000, ALFA),
        *contract("CAN9700001", "3", S, "Licitatie deschisa", SUB, "2023-02-15", 400_000, ALFA),
        *contract("CAN9700001", "4", S, "Licitatie deschisa", SUB, "2023-03-05", 200_000, ALFA),
        *contract("CAN9700001", "5", S, "Licitatie deschisa", SUB, "2023-03-20", 50_000, ALFA),
        *contract("CAN9700002", "1", S, "Licitatie deschisa", FW, "2023-01-12", 1_000_000, BETA),
        *contract("CAN9700002", "2", S, "Licitatie deschisa", SUB, "2023-02-20", 1_100_000, BETA),
        *contract("CAN9700003", "1", C, "Licitatie deschisa", FW, "2023-01-15", 1_000_000, ALFA),
        *contract("CAN9700003", "2", C, "Licitatie deschisa", SUB, "2023-02-01", 600_000, ALFA),
        *contract("CAN9700003", "3", C, "Licitatie deschisa", SUB, "2023-02-10", 300_000, ALFA),
        *contract("CAN9700004", "1", C, "Licitatie deschisa", FW, "2023-01-20", "", ALFA),
        *contract("CAN9700004", "2", C, "Licitatie deschisa", SUB, "2023-02-10", 5_000_000, ALFA),
        *contract("CAN9700005", "2", N, "Licitatie deschisa", SUB, "2023-02-01", 1_000_000, ALFA),
        *contract("CAN9700005", "3", N, "Licitatie deschisa", SUB, "2023-03-01", 500_000, ALFA),
        *contract("CAN9700006", "1", N, "Licitatie deschisa", FW, "2023-01-05", 600_000, ALFA),
        *contract("CAN9700006", "2", N, "Licitatie deschisa", FW, "2023-01-08", 400_000, BETA),
        *contract("CAN9700006", "3", N, "Licitatie deschisa", SUB, "2023-02-01", 700_000, BETA),
        *contract("CAN9700006", "4", N, "Licitatie deschisa", SUB, "2023-02-20", 500_000, GAMMA),
        *contract("CAN9700007", "1", S, "Licitatie deschisa", FW, "2023-01-15", 1_000_000, BETA),
        *contract("CAN9700007", "2", S, "Licitatie deschisa", SUB, "2023-02-20", 1_200_000, BETA),
        *contract("CAN9700008", "1", C, "Licitatie deschisa", FW, "2023-01-02", 500_000, GAMMA),
        *contract("CAN9700008", "2", C, "Licitatie deschisa", SUB, "2023-01-25", 300_000, GAMMA),
        *contract("CAN9700008", "3", C, "Licitatie deschisa", SUB, "2023-02-05", 270_000, ALFA, GAMMA),
    ], "t1-2023")
    # a framework awarded in 2020: its ceiling is in an older file than its call-offs (CAN9700005 above)
    contracte("2020Q4", at(2021, 3, 20), [*contract("CAN9700005", "1", N, "Licitatie deschisa", FW, "2020-11-10", 1_000_000, ALFA)], "t4-2020")

    companies = [ALFA, BETA, GAMMA, CNAIR]
    archive_batch(a, [int(cui) for _, cui in companies], date(2026, 11, 2), anaf_response([anaf_entry(int(cui), name) for name, cui in companies], []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
