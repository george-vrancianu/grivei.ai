"""Builds `archive-crawl/`, the raw-archive fixture for the crawled Records (ticket #77). Run from `watchdog/`:

    .venv/bin/python tests/fixtures/build_crawl_archive.py

Every name, code and CUI is invented. The crawl days are shaped like e-licitatie's real `GetCANoticeList` and
`GetCANoticeContracts` answers (the field names of connectors/seap_harvest.py) and written through the crawl's own archive
writer, so each day has the manifest the real crawl writes. The output is committed, so tests and seam 1 read it as it is.

What it holds:
- a Contracte bulk file for 2026 Q1 (fetched 2026-11-10) with one contract, CAN9200001~C-1, value 150000 lei;
- crawl 2026-02-10 (Q1, which the bulk covers): the same contract crawled with value 100000 (the bulk supersedes it) and
  CAN9200002~C-7, which the bulk does not have (survives, crawl-only);
- crawl 2026-04-01 (Q2, no bulk): a CAN with a procedure (contract CAN9200003~9/2026), an SCNA (type 18) with a contract,
  and a CAN without a procedure (procedureId null) with two contracts, read as one award notice; fetched 2026-11-11, and
  fetched again 2026-11-12 with a newer value for CAN9200003~9/2026 (the re-crawl: the later fetch wins);
- crawl 2026-04-02: a day with no notices (a complete day: it moves the cursor to 2026-04-02);
- crawl 2026-04-03: killed half way, no manifest: invisible (its CAN9200009 must never show up).
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
from pipeline.crawl.unitdir import UnitWriter  # noqa: E402

OUT = Path(__file__).parent / "archive-crawl"

H22 = ("|DENUMIRE_AC|,|CUI_AC|,|COD_NUTS|,|DENUMIRE_NUTS|,|TIP_PROCEDURA|,|INCHEIAT_PRIN|,|MODALITATE_DESFASURARE|,|NUMAR_ANUNT_INITIERE|,"
       "|DATA_ANUNT_INITIERE|,|NUMAR_ANUNT_ATRIBUIRE|,|DATA_ANUNT_ATRIBUIRE|,|NUMAR_LOT|,|NUMAR_CONTRACT|,|DENUMIRE_CONTRACT|,|DATA_CONTRACT|,"
       "|VALOARE_ESTIMATA_RON|,|VALOARE_CONTRACT_RON|,|OFERTANT|,|CUI_OFERTANT|")


def at(y, m, d, h=9):
    return datetime(y, m, d, h, 0, tzinfo=timezone.utc)


def notice(ca_id, code, day, *, type_id=3, version=2, procedure=1, title="Servicii de curățenie", authority="1000001 - SPITALUL EXEMPLU",
           contract_type="Servicii", procedure_type="Licitatie deschisa", cpv="90910000-9 - Servicii de curatenie (Rev.2)"):
    return {
        "caNoticeId": ca_id, "noticeId": ca_id + 1000, "procedureId": procedure, "noticeNo": code, "sysNoticeTypeId": type_id,
        "sysNoticeVersionId": version, "sysNoticeState": {"id": 1, "text": "Publicat"}, "sysProcedureState": {"id": 5, "text": "Atribuita"},
        "contractingAuthorityNameAndFN": authority, "contractTitle": title, "sysAcquisitionContractType": {"id": 2, "text": contract_type},
        "sysProcedureType": {"id": 4, "text": procedure_type}, "sysContractAssigmentType": {"id": 1, "text": "Contract de achizitii publice"},
        "cpvCodeAndName": cpv, "ronContractValue": 0, "noticeStateDate": f"{day}T11:02:30+02:00", "isOnline": True, "currencyCode": "RON",
        "estimatedValueExport": "0 RON",
    }


def contract(contract_id, notice_code, number, value, day, winners, title="Servicii de curățenie"):
    return {
        "caNoticeContractId": contract_id, "noticeNo": notice_code, "contractNo": number, "contractDate": f"{day}T00:00:00+02:00",
        "contractTitle": title, "lotsNoCaption": "", "lotsCaption": "", "contractValue": value, "currency": {"text": "RON"},
        "defaultCurrencyContractValue": value,
        "winners": [{"name": n, "fiscalNumber": cui, "entityId": 7000 + i, "address": {"city": "Cluj-Napoca", "county": {"text": "Cluj"}, "country": "Romania",
                                                                                   "isSME": True, "address": "Str. Exemplu 1"}}
                    for i, (n, cui) in enumerate(winners)],
    }


def page(items, total=None):
    return {"items": items, "total": len(items) if total is None else total, "searchTooLong": False}


def raw(payload) -> bytes:  # the bytes as an API would send them: archived unchanged
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def crawl_day(archive, day, notices, contracts, fetched, *, complete=True):
    w = UnitWriter.open(archive, day, fetched)
    w.put(f"notices-{day}_{day}-p0000.json", raw(page(notices)))
    for n in notices:
        found = contracts.get(n["caNoticeId"], [])
        w.put(f"contracts-{n['caNoticeId']}-s00000.json", raw(page(found)))
    if complete:
        w.commit(fetched, "https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/",
                 {"window": [day, day], "notices": len(notices), "kept": len(notices), "listPages": 1, "contractPages": len(notices),
                  "contracts": sum(len(contracts.get(n["caNoticeId"], [])) for n in notices), "keep": "keep_all"})


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    a = Archive(OUT)
    csv = H22 + "\n" + (
        "|SPITALUL EXEMPLU|,|1000001|,|RO113|,|Cluj|,|Licitatie deschisa|,|Fara acord cadru|,|Online|,|CN9900002|,|01/05/2026|,|CAN9200001|,|02/10/2026|,"
        "|1|,|C-1|,|Servicii de curatenie|,|02/01/2026|,150000,150000,|CURAT NOU SRL|,|2000011|\n")
    a.write_unit(source="seap", stream="bulk", kind="contracte", unit="2026Q1", fetched_at=at(2026, 11, 10), files={"raport-contracte-t1-2026.csv": csv.encode("utf-8")},
                 via="Contracte 2026 - T1", url="https://data.gov.ro/fixture/raport-contracte-t1-2026.csv")

    n1, n2 = notice(92000011, "CAN9200001", "2026-02-10"), notice(92000012, "CAN9200002", "2026-02-10", title="Reparații drumuri comunale")
    crawl_day(a, "2026-02-10", [n1, n2], {
        n1["caNoticeId"]: [contract(1, "CAN9200001", "C-1", 100000.00, "2026-02-01", [("CURAT NOU SRL", "2000011")])],
        n2["caNoticeId"]: [contract(2, "CAN9200002", "C-7", 20000.50, "2026-02-02", [("DRUMURI DEMO SA", "RO2000012")])],
    }, at(2026, 11, 11))

    can = notice(92000013, "CAN9200003", "2026-04-01", title="Lucrări de reparații școală")
    scna = notice(92000014, "SCNA9200004", "2026-04-01", type_id=18, title="Contract subsecvent: papetărie", contract_type="Furnizare")
    plain = notice(92000015, "CAN9200005", "2026-04-01", procedure=None, procedure_type="Negociere fara publicare prealabila", title="Servicii juridice")
    day1 = {
        can["caNoticeId"]: [contract(3, "CAN9200003", "9/2026", 75000.00, "2026-03-30", [("CONSTRUCT DEMO SRL", "2000013")])],
        scna["caNoticeId"]: [contract(4, "SCNA9200004", "S-1", 3000.25, "2026-03-31", [("PAPETARIE DEMO SRL", "2000014")])],
        plain["caNoticeId"]: [contract(5, "CAN9200005", "J-1", 1000.00, "2026-03-29", [("AVOCATI DEMO", "2000015")]),
                              contract(6, "CAN9200005", "J-2", 2500.50, "2026-03-30", [("AVOCATI DEMO", "2000015")])],
    }
    crawl_day(a, "2026-04-01", [can, scna, plain], day1, at(2026, 11, 11))
    day1_again = dict(day1)
    day1_again[can["caNoticeId"]] = [contract(3, "CAN9200003", "9/2026", 80000.00, "2026-03-30", [("CONSTRUCT DEMO SRL", "2000013")])]
    crawl_day(a, "2026-04-01", [can, scna, plain], day1_again, at(2026, 11, 12))  # the trailing re-crawl: a later fetch of the same day

    crawl_day(a, "2026-04-02", [], {}, at(2026, 11, 12))
    ghost = notice(92000019, "CAN9200009", "2026-04-03", title="Never seen")
    crawl_day(a, "2026-04-03", [ghost], {ghost["caNoticeId"]: [contract(9, "CAN9200009", "G-1", 1.00, "2026-04-02", [("FANTOMA SRL", "2000019")])]},
              at(2026, 11, 12), complete=False)


if __name__ == "__main__":
    build()
    print(f"wrote {OUT}")
