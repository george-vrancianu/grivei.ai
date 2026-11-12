"""Builds `archive-backfill/`, the raw-archive fixture for the backfill (ticket #78). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_backfill_archive.py

Every name, code and CUI is invented. The backfill weeks are shaped like what `pipeline backfill` archives (the crawl core's
list pages and contracts pages, a manifest last whose `crawl` block names the pass and the week) under the kind
`award-notices-backfill`; the bulk files are the ones the 2023-today pass matches against.

What it holds:
- pass 2021-22, week 2021-04-05..2021-04-11 (fetched 2026-11-11): CAN9400001 "Negociere fara publicare prealabila" with two contracts
  (1,000.00 + 2,500.50 lei: one award notice worth 3,500.50), CAN9400002 "Procedura simplificata proprie" (50,000 lei), and
  CAN9400003, a notice WITH a procedure that is listed but dropped (no contracts file);
- pass 2021-22, week 2022-12-26..2022-12-31 (fetched 2026-11-12): CAN9400004 "Norme proprii (Anexa 2)" (12,000 lei);
- pass 2021-22, week 2021-04-12..2021-04-18: killed half way, no manifest: invisible (its CAN9400009 must never show up);
- pass 2023-today, week 2023-01-02..2023-01-08 (fetched 2026-11-11): CAN9300001 / B-1 (100,000 lei, which the 2023 Q1 bulk, fetched
  AFTER, has with 150,000: the bulk supersedes it), CAN9300002 / B-2 (20,000.50 lei, not in the bulk: survives), and two notices that
  are listed but dropped because the bulk or the backfill already has them (CAN9300003, CAN9400002);
- bulk 2023 Q1 (fetched 2026-11-12): Contracte CAN9300001 / B-1 (150,000) and CAN9300003 / B-3 (300), "fara anunt" CAN9300011 (7,000).
"""
from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WATCHDOG))
sys.path.insert(0, str(Path(__file__).parent))

from openpyxl import Workbook  # noqa: E402

from build_crawl_archive import H22, contract, notice, page, raw  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.crawl.unitdir import BACKFILL_KIND, UnitWriter  # noqa: E402

OUT = Path(__file__).parent / "archive-backfill"


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def week(archive, pass_name, label, first, last, notices, contracts, fetched, *, keep, complete=True):
    """One backfill week as the crawl core writes it: every list row, the contracts of the kept notices only, the manifest last."""
    w = UnitWriter.open(archive, first, fetched, BACKFILL_KIND)
    w.put(f"notices-{first}_{last}-p0000.json", raw(page(notices)))
    kept = [n for n in notices if keep(n)]
    for n in kept:
        w.put(f"contracts-{n['caNoticeId']}-s00000.json", raw(page(contracts.get(n["caNoticeId"], []))))
    if complete:
        w.commit(fetched, "https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/", {
            "window": [first, last], "notices": len(notices), "kept": len(kept), "listPages": 1, "contractPages": len(kept),
            "contracts": sum(len(contracts.get(n["caNoticeId"], [])) for n in kept), "keep": keep.__name__, "pass": pass_name, "week": label})


def procedure_is_null(row):
    return row["procedureId"] is None


def missing_from_bulk_and_backfill(row):
    return row["noticeNo"] in ("CAN9300001", "CAN9300002")


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    neg = dict(procedure=None, procedure_type="Negociere fara publicare prealabila")

    n1 = notice(94000011, "CAN9400001", "2021-04-06", title="Servicii juridice urgente", **neg)
    n2 = notice(94000012, "CAN9400002", "2021-04-07", title="Lucrări de reparații drum", procedure=None, procedure_type="Procedura simplificata proprie")
    n3 = notice(94000013, "CAN9400003", "2021-04-08", title="Achiziție mobilier")
    week(a, "2021-22", "2021-W14", "2021-04-05", "2021-04-11", [n1, n2, n3], {
        n1["caNoticeId"]: [contract(1, "CAN9400001", "J-1", 1000.00, "2021-04-02", [("AVOCATI DEMO", "2000021")]),
                           contract(2, "CAN9400001", "J-2", 2500.50, "2021-04-03", [("AVOCATI DEMO", "2000021")])],
        n2["caNoticeId"]: [contract(3, "CAN9400002", "D-1", 50000.00, "2021-04-05", [("DRUMURI DEMO SA", "RO2000012")])],
        n3["caNoticeId"]: [contract(4, "CAN9400003", "M-1", 9999.00, "2021-04-05", [("MOBILA DEMO SRL", "2000022")])],
    }, at(2026, 11, 11), keep=procedure_is_null)

    n4 = notice(94000014, "CAN9400004", "2022-12-28", title="Servicii de paza", procedure=None, procedure_type="Norme proprii (Anexa 2)")
    week(a, "2021-22", "2022-W52", "2022-12-26", "2022-12-31", [n4], {
        n4["caNoticeId"]: [contract(5, "CAN9400004", "P-1", 12000.00, "2022-12-27", [("PAZA DEMO SRL", "2000023")])]}, at(2026, 11, 12), keep=procedure_is_null)

    ghost = notice(94000019, "CAN9400009", "2021-04-14", title="Never seen", procedure=None, procedure_type="Negociere fara publicare prealabila")
    week(a, "2021-22", "2021-W15", "2021-04-12", "2021-04-18", [ghost], {
        ghost["caNoticeId"]: [contract(9, "CAN9400009", "G-1", 1.00, "2021-04-13", [("FANTOMA SRL", "2000029")])]}, at(2026, 11, 12), keep=procedure_is_null, complete=False)

    c1 = notice(93000011, "CAN9300001", "2023-01-04", title="Servicii de curățenie")
    c2 = notice(93000012, "CAN9300002", "2023-01-05", title="Reparații drumuri comunale")
    c3 = notice(93000013, "CAN9300003", "2023-01-06", title="Hârtie și toner")
    c4 = notice(94000012, "CAN9400002", "2023-01-06", title="Lucrări de reparații drum (re-dated)", procedure=None, procedure_type="Procedura simplificata proprie")
    week(a, "2023-today", "2023-W01", "2023-01-02", "2023-01-08", [c1, c2, c3, c4], {
        c1["caNoticeId"]: [contract(11, "CAN9300001", "B-1", 100000.00, "2023-01-02", [("CURAT NOU SRL", "2000011")])],
        c2["caNoticeId"]: [contract(12, "CAN9300002", "B-2", 20000.50, "2023-01-03", [("DRUMURI DEMO SA", "RO2000012")])],
    }, at(2026, 11, 11), keep=missing_from_bulk_and_backfill)

    def row(notice_code, published, number, title, value, supplier, cui):
        return (f"|SPITALUL EXEMPLU|,|1000001|,|RO113|,|Cluj|,|Licitatie deschisa|,|Fara acord cadru|,|Online|,|CN9900002|,|11/20/2022|,|{notice_code}|,"
                f"|{published}|,|1|,|{number}|,|{title}|,|01/03/2023|,{value},{value},|{supplier}|,| {cui}|")

    csv = "\n".join([H22, row("CAN9300001", "01/04/2023", "B-1", "Servicii de curatenie", 150000, "CURAT NOU SRL", "2000011"),
                     row("CAN9300003", "01/06/2023", "B-3", "Hartie si toner", 300, "PAPETARIE DEMO SRL", "2000014")]) + "\n"
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2023Q1", fetched_at=at(2026, 11, 12), files={"raport-contracte-t1-2023.csv": csv.encode()},
                 via="Contracte 2023 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2023.csv")

    wb = Workbook()
    ws = wb.active
    ws.append(["Autoritate contractanta", "CUI autoritate contractanta", "Tip anunt", "Tip procedura", "Numar anunt atribuire", "Data publicare",
               "Tip legislatie", "Incheiat prin", "Tip contract", "Criteriu de atribuire", "Cod CPV", "Denumire CPV", "Data contract",
               "Numar contract", "Denumire contract", "Valoare atribuita (RON)", "Ofertant castigator ", "CUI ofertant castigator"])
    ws.append(["CENTRUL MEDICAL EXEMPLU", 13641538, "Anunt de atribuire", "Norme proprii (Anexa 2B)", "CAN9300011", datetime(2023, 1, 5, 8, 0, 0),
               "Legea nr. 98/23.05.2016", "Fara acord cadru", "Servicii", "Pretul cel mai scazut", "85147000-1", "Servicii de medicina muncii (Rev.2)",
               datetime(2023, 1, 3), "7", "Analize medicale", 7000, "CLINICA DEMO SRL", 11963146])
    tmp = OUT / "_tmp.xlsx"
    wb.save(tmp)
    a.write_unit(source="seap", stream="bulk", kind="fara-anunt", unit="2023Q1", fetched_at=at(2026, 11, 12), files={"fara-anunt-t1-2023.xlsx": tmp.read_bytes()},
                 via="Anunturi fara anunt de initiere T1 2023", url="https://data.gov.ro/fixture/fara-anunt-t1-2023.xlsx")
    tmp.unlink()


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
