"""Builds `archive-coverage/`, the raw-archive fixture for the Coverage grid (ticket #79). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_coverage_archive.py

Every name, code and CUI is invented. Pair it with `coverage-known-gaps.csv` and a rebuild day of 2025-09-20 (the current quarter is 2025 Q3).
It is a miniature of the operator's archive that holds every cell state of the grid:

- DA 2022 Q1 (3 rows): LOADED. DA 2022 Q2 with headers nobody knows: quarantined -> NOT_YET_LOADED (no rule, no note).
- Contracte 2024 Q2..2025 Q2 with 12, 18, 9, 23 and 15 contracts (the real 2024 Q4 Contracte file has 95k rows against 124-229k in the other quarters): 2024 Q4 is below 60% of the median of its four neighbours (16.5 -> 9.9) -> POSSIBLY_INCOMPLETE; the others LOADED.
  A crawled day (2025-06-30) adds one crawl-only contract to 2025 Q2 (16 Records, 15 file rows).
- Backfill pass 2021-22: every planned week that overlaps 2021 Q2 is complete (two award notices in the week of 2021-05-03): the 2021 Q2
  award notices are LOADED (covered via e-licitatie). 2021 Q3 has one complete week (one award notice) only: still NOT_IN_SOURCE. 2021 Q1 and
  2022 award notices: NOT_IN_SOURCE.
- Crawl days 2025-06-30 (the Q2 crawl-only contract), 2025-07-01 and 2025-07-02 (contracts and award notices of 2025 Q3): CRAWLED_PROVISIONAL
  with data-through 2025-07-02; crawled award notices (2) and contracts (3) counted.
- DAN 2025 Q2: nothing archived, listed in `coverage-known-gaps.csv`: KNOWN_GAP, the note served verbatim.
- DA and DAN in 2025 Q3: nothing -> NOT_YET_LOADED awaiting the bulk file.
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(Path(__file__).parent))

from build_backfill_archive import procedure_is_null, week  # noqa: E402
from build_bulk_archive import DA_HEADER, da_row  # noqa: E402
from build_contracts_archive import H22, row22  # noqa: E402
from build_crawl_archive import contract, crawl_day, notice  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.crawl.backfill import FIRST_DAY, LAST_DAY_2021_22, week_windows  # noqa: E402

OUT = Path(__file__).parent / "archive-coverage"
TODAY = "2025-09-20"

CONTRACTS = {(2024, 2): 12, (2024, 3): 18, (2024, 4): 9, (2025, 1): 23, (2025, 2): 15}  # file rows per quarter (all distinct contracts)


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def bulk(archive, kind, quarter, fetched, name, data, via):
    archive.write_unit(source="seap", stream="bulk", kind=kind, unit=quarter, fetched_at=fetched, files={name: data}, via=via,
                       url=f"https://data.gov.ro/fixture/{name}")


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    da = [DA_HEADER, da_row("DA96000001", "03/28/2022", "Hartie A4", "1200.5"), da_row("DA96000002", "03/29/2022", "Creioane", "40"),
          da_row("DA96000003", "03/31/2022", "Markere", "75.25")]
    bulk(a, "da", "2022Q1", at(2022, 6, 15), "raport-achizitii-directe-t1-2022.csv", ("\n".join(da) + "\n").encode(), "Achizitii directe 2022 - T1")
    bulk(a, "da", "2022Q2", at(2022, 9, 15), "raport-achizitii-directe-t2-2022.csv", b"NUMAR,DATA,SUMA\nDA96000099,04/01/2022,10\n", "Achizitii directe 2022 - T2")

    for (year, q), n in CONTRACTS.items():
        month = 3 * q - 1  # published in the quarter's middle month, day 1..n
        rows = [row22(f"CAN95{year % 100}{q}{i:03d}", f"{month:02d}/{i:02d}/{year}", 1, f"K-{i}", f"Contract {i}", 1000 + i, "CURAT EXEMPLU SRL", "2000001")
                for i in range(1, n + 1)]
        bulk(a, "contracte", f"{year}Q{q}", at(year + (q == 4), (3 * q) % 12 + 1, 10),
             f"raport-contracte-t{q}-{year}.csv", ("\n".join([H22, *rows]) + "\n").encode(), f"Contracte {year} - T{q}")

    # backfill pass 2021-22: every planned week that overlaps 2021 Q2 is complete, the weeks of 2021-05-03 and 2021-07-05 hold award notices
    neg = dict(procedure=None, procedure_type="Negociere fara publicare prealabila")
    an1 = notice(95100011, "CAN9510001", "2021-05-04", title="Servicii juridice urgente", **neg)
    an2 = notice(95100012, "CAN9510002", "2021-05-06", title="Servicii de paza", **neg)
    an3 = notice(95100013, "CAN9510003", "2021-07-07", title="Servicii de curatenie", **neg)
    notices = {"2021-05-03": [an1, an2], "2021-07-05": [an3]}
    contracts = {an1["caNoticeId"]: [contract(1, "CAN9510001", "J-1", 1000.00, "2021-05-01", [("AVOCATI DEMO", "2000021")])],
                 an2["caNoticeId"]: [contract(2, "CAN9510002", "P-1", 2500.50, "2021-05-03", [("PAZA DEMO SRL", "2000023")])],
                 an3["caNoticeId"]: [contract(3, "CAN9510003", "C-1", 300.00, "2021-07-05", [("CURAT EXEMPLU SRL", "2000001")])]}
    for first, last in week_windows(FIRST_DAY, LAST_DAY_2021_22):
        covers_q2 = first.isoformat() <= "2021-06-30" and last.isoformat() >= "2021-04-01"
        if covers_q2 or first.isoformat() in notices:
            iso = first.isocalendar()
            week(a, "2021-22", f"{iso.year}-W{iso.week:02d}", first.isoformat(), last.isoformat(), notices.get(first.isoformat(), []), contracts,
                 at(2026, 11, 11), keep=procedure_is_null)

    # crawl days: the Q2 crawl-only contract, then 2025 Q3 contracts and award notices (provisional)
    c0 = notice(95200010, "CAN9520010", "2025-06-30", title="Reparatii acoperis")
    crawl_day(a, "2025-06-30", [c0], {c0["caNoticeId"]: [contract(10, "CAN9520010", "X-1", 5000.00, "2025-06-27", [("CONSTRUCT DEMO SRL", "2000013")])]}, at(2025, 7, 1))
    c1 = notice(95200011, "CAN9520011", "2025-07-01", title="Servicii de curatenie")
    p1 = notice(95200012, "CAN9520012", "2025-07-01", title="Servicii juridice", **neg)
    crawl_day(a, "2025-07-01", [c1, p1], {
        c1["caNoticeId"]: [contract(11, "CAN9520011", "Y-1", 1000.00, "2025-06-30", [("CURAT EXEMPLU SRL", "2000001")]),
                           contract(12, "CAN9520011", "Y-2", 2000.00, "2025-06-30", [("CURAT EXEMPLU SRL", "2000001")])],
        p1["caNoticeId"]: [contract(13, "CAN9520012", "J-1", 700.00, "2025-06-30", [("AVOCATI DEMO", "2000021")])]}, at(2025, 7, 2))
    c2 = notice(95200013, "CAN9520013", "2025-07-02", title="Lucrari de reparatii")
    p2 = notice(95200014, "CAN9520014", "2025-07-02", title="Servicii de paza", **neg)
    crawl_day(a, "2025-07-02", [c2, p2], {
        c2["caNoticeId"]: [contract(14, "CAN9520013", "Z-1", 4000.00, "2025-07-01", [("CONSTRUCT DEMO SRL", "2000013")])],
        p2["caNoticeId"]: [contract(15, "CAN9520014", "P-1", 900.00, "2025-07-01", [("PAZA DEMO SRL", "2000023")])]}, at(2025, 7, 3))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
