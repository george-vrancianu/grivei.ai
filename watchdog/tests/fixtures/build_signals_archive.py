"""Builds `archive-signals/`, the raw-archive fixture of the Signal model (ticket #74). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_signals_archive.py

Every name, code, CUI and CNP is invented (CUIs have valid check digits; ANAF confirms the companies, so a supplier is CUI-keyed).
Caps in force in 2023: 270,120 RON (supplies, services), 900,400 RON (works); before 10 September 2022: 135,060 and 450,200.

  S = SPITALUL EXEMPLU 1000017, C = COMUNA EXEMPLU 1000009, N = CNAIR DEMO SA 2000031 (authorities);
  ALFA 2000007, BETA 2000015, GAMMA 2000023 (suppliers), a natural person (CNP, never stored).

DA 2023 Q1, over-cap (one Signal per authority and day):
  DA98000001  S -> ALFA   2023-01-10  300,000       over the cap            \\ the same Signal: S, 2023-01-10 (two suppliers)
  DA98000002  S -> BETA   2023-01-10  280,000       over the cap            /
  DA98000003  S -> ALFA   2023-01-11  270,120       exactly the cap: no Signal
  DA98000004  S -> ALFA   2023-01-12  270,120.01    just above the cap: a Signal
  DA98000005  S -> ALFA   2023-01-13  2,701,200     exactly 10x: a suspect value, no Signal
  DA98000006  S -> ALFA   2023-01-14  2,701,199.99  just below 10x: a Signal (multiple 10.0)
  DA98000007  S -> GAMMA  2023-01-15  500,000       CPV 70 (rent): exempt
  DA98000008  C -> ALFA   2023-02-01  800,000       CPV 45 (works), under the works cap: no Signal
  DA98000009  C -> ALFA   2023-02-02  950,000       CPV 45, over the works cap: a Signal
  DA98000010  S -> a natural person 2023-02-03 400,000   a Signal whose only winner has no entity
  DA98000013  N -> ALFA   2023-02-20  100,000       under the cap
DA 2022 Q3: DA98100001 C -> BETA 2022-09-09 140,000 (over the OLD cap: a Signal);  DA98100002 C -> BETA 2022-09-10 140,000 (new era: none)
DA 2024 Q1: DA98200001 N -> BETA 2024-01-15 300,000 (a Signal in 2024)
Contracte 2023 Q1 (award date = DATA_CONTRACT):
  CAN9800001  S, "Negociere fara publicare prealabila", 2023-02-10  consortium ALFA + BETA 500,000   \\ one Signal: S, 2023-02-10
  CAN9800002  S, "Negociere fara publicare prealabila", 2023-02-10  GAMMA 100,000                    /
  CAN9800004  S, "Negociere" (not the rule's procedure)  2023-03-01 ALFA 50,000
  CAN9800005  C, "Licitatie deschisa" 2023-03-02 ALFA 70,000
  CAN9800006  S, "Negociere fara publicare prealabila", 2023-03-05  a natural person 600,000
  CAN9800008  N, "Licitatie deschisa" 2023-03-06 BETA 90,000
Contracte 2024 Q1: CAN9800003  C, "Negociere fara publicare prealabila", 2024-02-01 ALFA, blank value
Backfill (2021-22) and crawl (2026): copies of what `pipeline backfill` and `pipeline crawl` archive:
  CAN9400001  S, backfilled 2021-04-06 "Negociere fara publicare prealabila", two contracts (1,000.00 + 2,500.50)
  CAN9400002  S, backfilled "Procedura simplificata proprie" (not the rule's)
  CAN9200005  S, crawled 2026-04-01 (no initiation procedure) "Negociere fara publicare prealabila", award dates 2026-03-29 and -30
"""
from __future__ import annotations

import shutil
import sys
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
sys.path.insert(0, str(HERE))

from build_backfill_archive import procedure_is_null, week  # noqa: E402
from build_crawl_archive import contract as crawl_contract, crawl_day, notice  # noqa: E402
from build_identity_archive import anaf_entry, anaf_response  # noqa: E402
from build_roles_archive import ALFA, BETA, CNAIR, COMUNA, GAMMA, H22, PERSON, SPITAL, at  # noqa: E402
from build_roles_archive import contract as roles_contract  # noqa: E402
from pipeline.anaf import archive_batch  # noqa: E402
from pipeline.archive import Archive  # noqa: E402

OUT = HERE / "archive-signals"

DA_HEADER = ("|NUMAR_ACHIZITIE_DIRECTA|,|DATA_PUBLICARE_ACHIZITIE|,|STARE_ACHIZITIE|,|DENUMIRE_AC|,|CUI_AC|,|DENUMIRE_ACHIZITIE|,"
             "|COD_CPV|,|DENUMIRE_CPV|,|DATA_ATRIBUIRE_ACHIZITIE|,|VALOARE_ESTIMATA_RON|,|VALOARE_ATRIBUITA_RON|,|OFERTANT|,|CUI_OFERTANT|")


def da(code, award, value, authority, supplier, cpv="30197000-6", published=None):
    """`published` is the MM/DD/YYYY publication date (default: 20 March of the award year)."""
    y, m, d = award.split("-")
    return (f"|{code}|,|{published or f'03/20/{y}'}|,|Oferta acceptata|,|{authority[0]}|,|{authority[1]}|,|Achizitie {code}|,"
            f"|{cpv}|,|Cod {cpv}|,|{m}/{d}/{y}|,{value},{value},|{supplier[0]}|,|{supplier[1]}|")


def contract(notice, number, authority, procedure, by, award, value, *winners):
    """As in the roles fixture, but the award notice is published on the award day (the helper's fixed 10 February 2023 would date the 2024 file's data-through)."""
    y, m, d = award.split("-")
    return [row.replace("|02/10/2023|,|1|", f"|{m}/{d}/{y}|,|1|") for row in roles_contract(notice, number, authority, procedure, by, award, value, *winners)]


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)

    def da_unit(unit, fetched, rows, label):
        a.write_unit(source="seap", stream="bulk", kind="da", unit=unit, fetched_at=fetched,
                     files={f"raport-achizitii-directe-{label}.csv": ("\n".join([DA_HEADER, *rows]) + "\n").encode()},
                     via=f"Achizitii directe {label}", url=f"https://data.gov.ro/fixture/raport-achizitii-directe-{label}.csv")

    da_unit("2023Q1", at(2023, 6, 15), [
        da("DA98000001", "2023-01-10", "300000", SPITAL, ALFA), da("DA98000002", "2023-01-10", "280000", SPITAL, BETA),
        da("DA98000003", "2023-01-11", "270120", SPITAL, ALFA), da("DA98000004", "2023-01-12", "270120.01", SPITAL, ALFA),
        da("DA98000005", "2023-01-13", "2701200", SPITAL, ALFA), da("DA98000006", "2023-01-14", "2701199.99", SPITAL, ALFA),
        da("DA98000007", "2023-01-15", "500000", SPITAL, GAMMA, cpv="70220000-9"),
        da("DA98000008", "2023-02-01", "800000", COMUNA, ALFA, cpv="45233140-2"), da("DA98000009", "2023-02-02", "950000", COMUNA, ALFA, cpv="45233140-2"),
        da("DA98000010", "2023-02-03", "400000", SPITAL, PERSON), da("DA98000013", "2023-02-20", "100000", CNAIR, ALFA),
    ], "t1-2023")
    # published in the second half of 2022 (the 2022 Q3 file), awarded on either side of the cap change
    da_unit("2022Q3", at(2022, 12, 15), [da("DA98100001", "2022-09-09", "140000", COMUNA, BETA, published="09/20/2022"),
                                         da("DA98100002", "2022-09-10", "140000", COMUNA, BETA, published="09/20/2022")], "t3-2022")
    da_unit("2024Q1", at(2024, 6, 15), [da("DA98200001", "2024-01-15", "300000", CNAIR, BETA)], "t1-2024")

    def contracte(unit, fetched, rows, label):
        a.write_unit(source="seap", stream="bulk", kind="contracte", unit=unit, fetched_at=fetched,
                     files={f"raport-contracte-{label}.csv": ("\n".join([H22, *rows]) + "\n").encode()},
                     via=f"Contracte {label}", url=f"https://data.gov.ro/fixture/raport-contracte-{label}.csv")

    NEG, OPEN = "Negociere fara publicare prealabila", "Licitatie deschisa"
    NONE = "Fara acord cadru"
    contracte("2023Q1", at(2023, 6, 20), [
        *contract("CAN9800001", "1", SPITAL, NEG, NONE, "2023-02-10", 500_000, ALFA, BETA),
        *contract("CAN9800002", "1", SPITAL, NEG, NONE, "2023-02-10", 100_000, GAMMA),
        *contract("CAN9800004", "1", SPITAL, "Negociere", NONE, "2023-03-01", 50_000, ALFA),
        *contract("CAN9800005", "1", COMUNA, OPEN, NONE, "2023-03-02", 70_000, ALFA),
        *contract("CAN9800006", "1", SPITAL, NEG, NONE, "2023-03-05", 600_000, PERSON),
        *contract("CAN9800008", "1", CNAIR, OPEN, NONE, "2023-03-06", 90_000, BETA),
    ], "t1-2023")
    contracte("2024Q1", at(2024, 6, 20), [*contract("CAN9800003", "1", COMUNA, NEG, NONE, "2024-02-01", "", ALFA)], "t1-2024")

    # the 2021-22 backfill and the current-quarter crawl, written by the crawl core's own writer
    spital = "1000017 - SPITALUL EXEMPLU"
    n1 = notice(94000011, "CAN9400001", "2021-04-06", title="Servicii juridice urgente", authority=spital, procedure=None, procedure_type=NEG)
    n2 = notice(94000012, "CAN9400002", "2021-04-07", title="Lucrari de reparatii drum", authority=spital, procedure=None, procedure_type="Procedura simplificata proprie")
    week(a, "2021-22", "2021-W14", "2021-04-05", "2021-04-11", [n1, n2], {
        n1["caNoticeId"]: [crawl_contract(1, "CAN9400001", "J-1", 1000.00, "2021-04-02", [("AVOCATI DEMO", "2000021")]),
                           crawl_contract(2, "CAN9400001", "J-2", 2500.50, "2021-04-03", [("AVOCATI DEMO", "2000021")])],
        n2["caNoticeId"]: [crawl_contract(3, "CAN9400002", "D-1", 50000.00, "2021-04-05", [("DRUMURI DEMO SA", "RO2000012")])],
    }, at(2026, 11, 11), keep=procedure_is_null)
    plain = notice(92000015, "CAN9200005", "2026-04-01", authority=spital, procedure=None, procedure_type=NEG, title="Servicii juridice")
    crawl_day(a, "2026-04-01", [plain], {plain["caNoticeId"]: [crawl_contract(5, "CAN9200005", "J-1", 1000.00, "2026-03-29", [("AVOCATI DEMO", "2000015")]),
                                                              crawl_contract(6, "CAN9200005", "J-2", 2500.50, "2026-03-30", [("AVOCATI DEMO", "2000015")])]},
              at(2026, 11, 11))

    companies = [ALFA, BETA, GAMMA, CNAIR]
    archive_batch(a, [int(cui) for _, cui in companies], date(2026, 11, 2), anaf_response([anaf_entry(int(cui), name) for name, cui in companies], []), at(2026, 11, 2, 8))


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
