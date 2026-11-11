#!/usr/bin/env python3
"""
SEAP connector (e-licitatie.ro) — downloads, for one contracting authority:
  * the direct purchases completed within a date range,
  * the award notices published within the range,
  * the contracts (with winners + CUI) attached to each notice.

Writes a JSON with the structure {authority, da[], notices[], contracts[], harvested_at},
which connectors/load_batch.py then loads.

The endpoints are the ones used by the public SEAP interface (undocumented, but stable for years):
  GET  /api-pub/ComboPub/searchContractingAuthorities?filter=<nume>
  POST /api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/
  POST /api-pub/NoticeCommon/GetCANoticeList/
  POST /api-pub/C_PUBLIC_CANotice/GetCANoticeContracts

Example:
  python connectors/seap_harvest.py --authority "MUNICIPIUL BRASOV" --from 2024-01-01 --out data/raw/seap_brasov.json
Needs only `requests`. Be gentle with the server: ~3 requests/second, pages of 100.
"""
import argparse, json, sys, time
from datetime import datetime, date

import requests

BASE = "https://e-licitatie.ro"
HDR = {"Content-Type": "application/json", "Accept": "application/json",
       "User-Agent": "watchdog-research/0.1 (+contact: see README)",
       # api-pub answers 403 "Referrer cannot be null" without it (since ~Nov 2026); the public UI sends this one.
       "Referer": "https://e-licitatie.ro/pub"}
PAUSE = 0.35


def post(path, body):
    r = requests.post(BASE + path, json=body, headers=HDR, timeout=60)
    r.raise_for_status()
    return r.json()


def get(path):
    r = requests.get(BASE + path, headers=HDR, timeout=60)
    r.raise_for_status()
    return r.json()


def find_authority(name):
    j = get(f"/api-pub/ComboPub/searchContractingAuthorities?filter={requests.utils.quote(name)}&pageIndex=0&pageSize=50&parentId=")
    items = j.get("items", [])
    exact = [i for i in items if i["text"].split(" ", 1)[1].strip().lower() == name.lower()]
    pick = exact[0] if exact else (items[0] if items else None)
    if not pick:
        sys.exit(f"Authority '{name}' not found in SEAP")
    cui, _, nm = pick["text"].partition(" ")
    return {"seapId": pick["id"], "cui": cui.replace("RO", "").strip(), "name": nm.strip(), "candidates": [i["text"] for i in items]}


def iso(d, end=False):
    return f"{d}T23:59:59+03:00" if end else f"{d}T00:00:00+02:00"


def direct_acquisitions(ca_id, d_from, d_to):
    out, p = [], 0
    while True:
        j = post("/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/", {
            "pageSize": 100, "pageIndex": p, "showOngoingDa": False, "cookieContext": None,
            "sysDirectAcquisitionStateId": None, "publicationDateStart": None, "publicationDateEnd": None,
            "finalizationDateStart": iso(d_from), "finalizationDateEnd": iso(d_to, True),
            "cpvCategoryId": None, "contractingAuthorityId": ca_id, "supplierId": None, "cpvCodeId": None,
            "assignedUserId": None, "isOpenForCorrection": None, "sysDirectAcquisitionTypeId": None,
            "directAcquisitionName": None, "uniqueIdentificationCode": None})
        for i in j["items"]:
            out.append({"id": i["directAcquisitionId"], "code": i["uniqueIdentificationCode"],
                        "name": i["directAcquisitionName"], "state": (i.get("sysDirectAcquisitionState") or {}).get("text"),
                        "cpv": i["cpvCode"], "pub": i["publicationDate"], "fin": i["finalizationDate"],
                        "supplier": i["supplier"], "ca": i["contractingAuthority"],
                        "est": i["estimatedValueRon"], "val": i["closingValue"]})
        print(f"  direct purchases: {len(out)}/{j['total']}", file=sys.stderr)
        if len(out) >= j["total"] or not j["items"]:
            return out
        p += 1; time.sleep(PAUSE)


def award_notices(ca_id, d_from, d_to):
    out, p = [], 0
    while True:
        j = post("/api-pub/NoticeCommon/GetCANoticeList/", {
            "sysNoticeTypeIds": [], "sortProperties": [], "pageIndex": p, "pageSize": 100,
            "contractingAuthorityId": ca_id,
            "startPublicationDate": iso(d_from), "endPublicationDate": iso(d_to, True)})
        t = lambda k: (i.get(k) or {}).get("text")
        for i in j["items"]:
            out.append({"caNoticeId": i["caNoticeId"], "noticeId": i["noticeId"], "procedureId": i["procedureId"],
                        "noticeNo": i["noticeNo"], "typeId": i["sysNoticeTypeId"], "state": t("sysNoticeState"),
                        "procState": t("sysProcedureState"), "ca": i["contractingAuthorityNameAndFN"],
                        "title": i["contractTitle"], "contractType": t("sysAcquisitionContractType"),
                        "procType": t("sysProcedureType"), "assignType": t("sysContractAssigmentType"),
                        "cpv": i["cpvCodeAndName"], "value": i["ronContractValue"], "date": i["noticeStateDate"],
                        "isOnline": i["isOnline"], "cur": i["currencyCode"], "est": i["estimatedValueExport"]})
        print(f"  award notices: {len(out)}/{j['total']}", file=sys.stderr)
        if len(out) >= j["total"] or not j["items"]:
            return out
        p += 1; time.sleep(PAUSE)


CONTRACTS_TAKE = 1000


def contracts_for(notice):
    """All the contracts of one award notice, paged with skip/take until `total`."""
    items = []
    while True:
        j = post("/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts", {
            "caNoticeId": notice["caNoticeId"], "contractNo": None, "winnerTitle": None, "winnerFiscalNumber": None,
            "contractDate": {"from": None, "to": None}, "contractValue": {"from": None, "to": None},
            "contractMinOffer": {"from": None, "to": None}, "contractMaxOffer": {"from": None, "to": None},
            "contractTitle": None, "lots": None, "sortOrder": [], "sysContractFrameworkType": {},
            "skip": len(items), "take": CONTRACTS_TAKE})
        page = j.get("items") or []
        items += page
        if len(items) >= j["total"]:
            break
        if not page:
            raise RuntimeError(f"contracts of notice {notice['caNoticeId']}: empty page at skip "
                               f"{len(items)}, total {j['total']}")
        time.sleep(PAUSE)
    out = []
    for c in items:
        ws = []
        for w in c.get("winners") or []:
            a = w.get("address") or {}
            ws.append({"name": w["name"], "cui": w.get("fiscalNumber"), "entityId": w.get("entityId"),
                       "city": a.get("city"), "county": (a.get("county") or {}).get("text"),
                       "country": a.get("country"), "isSME": a.get("isSME"), "addr": a.get("address")})
        out.append({"caNoticeId": notice["caNoticeId"], "noticeNo": c["noticeNo"], "id": c["caNoticeContractId"],
                    "contractNo": c["contractNo"], "date": c["contractDate"], "title": c["contractTitle"],
                    "lots": c["lotsNoCaption"], "lotsCaption": c["lotsCaption"], "value": c["contractValue"],
                    "cur": (c.get("currency") or {}).get("text"), "valueRon": c["defaultCurrencyContractValue"],
                    "winners": ws})
    return out


RETRIES, RETRY_PAUSE = 3, 5


def all_contracts(notices):
    """The contracts of every notice. A notice that still fails after RETRIES retries fails the run:
    a batch missing some notices' contracts would be silently truncated."""
    contracts = []
    for k, n in enumerate(notices, 1):
        for attempt in range(RETRIES + 1):
            try:
                contracts += contracts_for(n)
                break
            except Exception as e:
                if attempt == RETRIES:
                    raise
                print(f"  ! contracts {n['caNoticeId']} (attempt {attempt + 1}/{RETRIES + 1}): {e}", file=sys.stderr)
                time.sleep(RETRY_PAUSE * (attempt + 1))
        if k % 25 == 0:
            print(f"  contracts: {k}/{len(notices)} notices", file=sys.stderr)
        time.sleep(PAUSE)
    return contracts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--authority", required=True, help='e.g. "MUNICIPIUL BRASOV"')
    ap.add_argument("--from", dest="d_from", default="2024-01-01")
    ap.add_argument("--to", dest="d_to", default=date.today().isoformat())
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    auth = find_authority(a.authority)
    print(f"Authority: {auth['name']} (CUI {auth['cui']}, SEAP id {auth['seapId']})", file=sys.stderr)
    da = direct_acquisitions(auth["seapId"], a.d_from, a.d_to)
    notices = award_notices(auth["seapId"], a.d_from, a.d_to)
    contracts = all_contracts(notices)
    payload = {"authority": {k: auth[k] for k in ("seapId", "cui", "name")}, "da": da, "notices": notices,
               "contracts": contracts, "harvested_at": datetime.utcnow().isoformat() + "Z"}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"Wrote {a.out}: {len(da)} DA, {len(notices)} notices, {len(contracts)} contracts", file=sys.stderr)


if __name__ == "__main__":
    main()
