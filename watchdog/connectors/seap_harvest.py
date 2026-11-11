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
Needs only `requests`. Be gentle with the server: ~3 requests/second, pages of 1000. List queries are capped
server-side (2,000 DAs, 3,000 notices per query): a window that hits the cap is split by date, see capped_list().
"""
import argparse, json, sys, time
from datetime import datetime, date, timedelta

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


PAGE_SIZE = 1000
DA_CAP = 2000       # DirectAcquisition_MaxListItems in the /pub page config
NOTICE_CAP = 3000   # CaNotice_MaxListItems


def capped_list(label, fetch, d_from, d_to, cap, key):
    """All raw rows of a capped list endpoint between two days (inclusive), deduped by `key`.

    `fetch(day_from, day_to, page_index)` returns one page (`items`, `total`, `searchTooLong`). The server stops
    at `cap` rows per query and filters by day only, so a window that hits the cap is split in halves down to
    a single day; a single day still over the cap raises rather than truncate silently.
    """
    rows = {}

    def window(a, b):
        got, p = 0, 0
        while True:
            j = fetch(a.isoformat(), b.isoformat(), p)
            if j.get("searchTooLong") or j["total"] >= cap:
                if p:
                    raise RuntimeError(f"{label} {a}..{b}: hit the {cap} cap on page {p}")
                if a == b:
                    raise RuntimeError(f"{label} {a}: one day is over the {cap} result cap; cannot split further")
                mid = a + (b - a) // 2
                print(f"  {label}: {a}..{b} over the cap, splitting at {mid}", file=sys.stderr)
                time.sleep(PAUSE); window(a, mid)
                time.sleep(PAUSE); window(mid + timedelta(days=1), b)
                return
            for i in j["items"]:
                rows[i[key]] = i
            got += len(j["items"])
            print(f"  {label} {a}..{b}: {got}/{j['total']}", file=sys.stderr)
            if got >= j["total"] or not j["items"]:
                return
            p += 1; time.sleep(PAUSE)

    window(date.fromisoformat(d_from[:10]), date.fromisoformat(d_to[:10]))
    return list(rows.values())


def direct_acquisitions(ca_id, d_from, d_to):
    def fetch(a, b, p):
        return post("/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/", {
            "pageSize": PAGE_SIZE, "pageIndex": p, "showOngoingDa": False, "cookieContext": None,
            "sysDirectAcquisitionStateId": None, "publicationDateStart": None, "publicationDateEnd": None,
            "finalizationDateStart": iso(a), "finalizationDateEnd": iso(b, True),
            "cpvCategoryId": None, "contractingAuthorityId": ca_id, "supplierId": None, "cpvCodeId": None,
            "assignedUserId": None, "isOpenForCorrection": None, "sysDirectAcquisitionTypeId": None,
            "directAcquisitionName": None, "uniqueIdentificationCode": None})
    out = []
    for i in capped_list("direct purchases", fetch, d_from, d_to, DA_CAP, "directAcquisitionId"):
        out.append({"id": i["directAcquisitionId"], "code": i["uniqueIdentificationCode"],
                    "name": i["directAcquisitionName"], "state": (i.get("sysDirectAcquisitionState") or {}).get("text"),
                    "cpv": i["cpvCode"], "pub": i["publicationDate"], "fin": i["finalizationDate"],
                    "supplier": i["supplier"], "ca": i["contractingAuthority"],
                    "est": i["estimatedValueRon"], "val": i["closingValue"]})
    return out


def award_notices(ca_id, d_from, d_to):
    def fetch(a, b, p):
        return post("/api-pub/NoticeCommon/GetCANoticeList/", {
            "sysNoticeTypeIds": [], "sortProperties": [], "pageIndex": p, "pageSize": PAGE_SIZE,
            "contractingAuthorityId": ca_id,
            "startPublicationDate": iso(a), "endPublicationDate": iso(b, True)})
    out = []
    t = lambda k: (i.get(k) or {}).get("text")
    for i in capped_list("award notices", fetch, d_from, d_to, NOTICE_CAP, "caNoticeId"):
        out.append({"caNoticeId": i["caNoticeId"], "noticeId": i["noticeId"], "procedureId": i["procedureId"],
                    "noticeNo": i["noticeNo"], "typeId": i["sysNoticeTypeId"], "state": t("sysNoticeState"),
                    "procState": t("sysProcedureState"), "ca": i["contractingAuthorityNameAndFN"],
                    "title": i["contractTitle"], "contractType": t("sysAcquisitionContractType"),
                    "procType": t("sysProcedureType"), "assignType": t("sysContractAssigmentType"),
                    "cpv": i["cpvCodeAndName"], "value": i["ronContractValue"], "date": i["noticeStateDate"],
                    "isOnline": i["isOnline"], "cur": i["currencyCode"], "est": i["estimatedValueExport"]})
    return out


def contracts_for(notice):
    j = post("/api-pub/C_PUBLIC_CANotice/GetCANoticeContracts", {
        "caNoticeId": notice["caNoticeId"], "contractNo": None, "winnerTitle": None, "winnerFiscalNumber": None,
        "contractDate": {"from": None, "to": None}, "contractValue": {"from": None, "to": None},
        "contractMinOffer": {"from": None, "to": None}, "contractMaxOffer": {"from": None, "to": None},
        "contractTitle": None, "lots": None, "sortOrder": [], "sysContractFrameworkType": {}, "skip": 0, "take": 200})
    out = []
    for c in j.get("items", []):
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
    contracts = []
    for k, n in enumerate(notices, 1):
        try:
            contracts += contracts_for(n)
        except Exception as e:  # one broken notice doesn't stop the whole batch
            print(f"  ! contracts {n['caNoticeId']}: {e}", file=sys.stderr)
        if k % 25 == 0:
            print(f"  contracts: {k}/{len(notices)} notices", file=sys.stderr)
        time.sleep(PAUSE)
    payload = {"authority": {k: auth[k] for k in ("seapId", "cui", "name")}, "da": da, "notices": notices,
               "contracts": contracts, "harvested_at": datetime.utcnow().isoformat() + "Z"}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"Wrote {a.out}: {len(da)} DA, {len(notices)} notices, {len(contracts)} contracts", file=sys.stderr)


if __name__ == "__main__":
    main()
