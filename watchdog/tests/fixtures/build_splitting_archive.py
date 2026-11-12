"""Builds `archive-splitting/`, the raw-archive fixture of the `splitting` Signal rule (ticket #75). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_splitting_archive.py

Direct purchases only (DA 2023 and DA 2022 Q3). Every name, code and CUI is invented (the roles fixture's entities; ANAF confirms the
suppliers, so each is CUI-keyed). Caps: 270,120 RON (supplies, services) from 10 September 2022, 135,060 RON before; all CPV 30197000-6
(group 301) unless said. S = SPITALUL EXEMPLU, C = COMUNA EXEMPLU, N = CNAIR DEMO SA; ALFA, BETA, GAMMA suppliers.

  Trigger        DA97000001 S -> ALFA 2023-01-05 150,000 + DA97000002 S -> ALFA 2023-01-20 150,000: one Signal 01-05 .. 01-20, 300,000 > 270,120
                 DA97000010 S -> ALFA 2023-01-12 300,000 (over the cap: over-cap's Record, inside the range, not a member of the Signal)
  Near miss      DA97000003 S -> BETA 2023-01-05 + DA97000004 S -> BETA 2023-02-04: 31 days inclusive, no Signal
  Window edge    DA97000011 C -> BETA 2023-01-05 + DA97000012 C -> BETA 2023-02-03: 30 days inclusive, a Signal
  Merging        DA97000005 S -> GAMMA 2023-03-01, DA97000006 2023-03-20, DA97000007 2023-04-08 (150,000 each): windows 1-2 and 2-3 overlap: ONE Signal
                 DA97000008 + DA97000009 S -> GAMMA 2023-08-01 / 08-02 (150,000 each): a second, disjoint Signal of the same triple
  Cap change     DA97100001 C -> ALFA 2022-09-01 135,060 (at the old cap) + DA97100002 C -> ALFA 2022-09-20 135,100: 270,160 > the NEW cap: a Signal
                 DA97100003 C -> GAMMA 2022-09-02 100,000 + DA97100004 C -> GAMMA 2022-09-15 100,000: over the old cap, under the new: none
  Left out       DA97200001 N -> ALFA 2023-05-01 150,000 + DA97200002 N -> ALFA 2023-05-05 300,000 (over the cap): no Signal (an over-cap one)
                 DA97200003/4 N -> BETA 2023-06-01 150,000, CPV 70220000-9: rents are exempt
                 DA97200005/6 N -> GAMMA 2023-06-01 150,000 each to a natural person: no supplier to name
                 DA97200007 N -> GAMMA 2023-06-02 150,000 (CPV 30197000-6) + DA97200008 N -> GAMMA 2023-06-03 150,000 (CPV 30297000-6): two CPV groups
                 DA97200009 N -> GAMMA 2023-07-20 150,000 + DA97200010 N -> GAMMA 2023-07-21 2,701,200 (exactly 10x: a suspect value): no Signal
  Works          DA97300001/2 N -> ALFA 2023-09-01 / 09-10 500,000 each, CPV 45233140-2 (works cap 900,400): 1,000,000 > works cap, a Signal
                 DA97300003/4 N -> BETA 2023-09-01 / 09-10 400,000 each, CPV 45233140-2: 800,000 under the works cap (over the supplies one): none
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
from build_roles_archive import ALFA, BETA, CNAIR, COMUNA, GAMMA, PERSON, SPITAL, at  # noqa: E402
from build_signals_archive import DA_HEADER, da  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-splitting"


def buy(code, award, value, authority, supplier, cpv="30197000-6"):
    y, m, d = award.split("-")
    return da(code, award, str(value), authority, supplier, cpv=cpv, published=f"{m}/{d}/{y}")


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    def da_unit(unit, fetched, rows, label):
        a.write_unit(source="seap", stream="bulk", kind="da", unit=unit, fetched_at=fetched,
                     files={f"raport-achizitii-directe-{label}.csv": ("\n".join([DA_HEADER, *rows]) + "\n").encode()},
                     via=f"Achizitii directe {label}", url=f"https://data.gov.ro/fixture/raport-achizitii-directe-{label}.csv")

    S, C, N = SPITAL, COMUNA, CNAIR
    WORKS = "45233140-2"
    da_unit("2023Q1", at(2023, 11, 15), [
        buy("DA97000001", "2023-01-05", 150000, S, ALFA), buy("DA97000002", "2023-01-20", 150000, S, ALFA), buy("DA97000010", "2023-01-12", 300000, S, ALFA),
        buy("DA97000003", "2023-01-05", 150000, S, BETA), buy("DA97000004", "2023-02-04", 150000, S, BETA),
        buy("DA97000011", "2023-01-05", 150000, C, BETA), buy("DA97000012", "2023-02-03", 150000, C, BETA),
        buy("DA97000005", "2023-03-01", 150000, S, GAMMA), buy("DA97000006", "2023-03-20", 150000, S, GAMMA), buy("DA97000007", "2023-04-08", 150000, S, GAMMA),
        buy("DA97000008", "2023-08-01", 150000, S, GAMMA), buy("DA97000009", "2023-08-02", 150000, S, GAMMA),
        buy("DA97200001", "2023-05-01", 150000, N, ALFA), buy("DA97200002", "2023-05-05", 300000, N, ALFA),
        buy("DA97200003", "2023-06-01", 150000, N, BETA, cpv="70220000-9"), buy("DA97200004", "2023-06-01", 150000, N, BETA, cpv="70220000-9"),
        buy("DA97200005", "2023-06-01", 150000, N, PERSON), buy("DA97200006", "2023-06-01", 150000, N, PERSON),
        buy("DA97200007", "2023-06-02", 150000, N, GAMMA), buy("DA97200008", "2023-06-03", 150000, N, GAMMA, cpv="30297000-6"),
        buy("DA97200009", "2023-07-20", 150000, N, GAMMA), buy("DA97200010", "2023-07-21", 2701200, N, GAMMA),
        buy("DA97300001", "2023-09-01", 500000, N, ALFA, cpv=WORKS), buy("DA97300002", "2023-09-10", 500000, N, ALFA, cpv=WORKS),
        buy("DA97300003", "2023-09-01", 400000, N, BETA, cpv=WORKS), buy("DA97300004", "2023-09-10", 400000, N, BETA, cpv=WORKS),
    ], "t1-2023")
    da_unit("2022Q3", at(2022, 12, 15), [
        buy("DA97100001", "2022-09-01", 135060, C, ALFA), buy("DA97100002", "2022-09-20", 135100, C, ALFA),
        buy("DA97100003", "2022-09-02", 100000, C, GAMMA), buy("DA97100004", "2022-09-15", 100000, C, GAMMA),
    ], "t3-2022")

    companies = [ALFA, BETA, GAMMA, CNAIR]
    archive_batch(a, [int(cui) for _, cui in companies], date(2026, 11, 2), anaf_response([anaf_entry(int(cui), name) for name, cui in companies], []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
