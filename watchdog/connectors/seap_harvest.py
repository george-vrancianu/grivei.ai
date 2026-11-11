#!/usr/bin/env python3
"""
Conector SEAP (e-licitatie.ro) — descarcă pentru o autoritate contractantă:
  * achizițiile directe finalizate într-un interval,
  * anunțurile de atribuire publicate în interval,
  * contractele (cu câștigători + CUI) atașate fiecărui anunț.

Scrie un JSON cu structura {authority, da[], notices[], contracts[], harvested_at}
pe care îl încarcă apoi connectors/load_batch.py.

Endpoint-urile sunt cele folosite de interfața publică SEAP (nedocumentate, dar stabile de ani):
  GET  /api-pub/ComboPub/searchContractingAuthorities?filter=<nume>
  POST /api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/
  POST /api-pub/NoticeCommon/GetCANoticeList/
  POST /api-pub/C_PUBLIC_CANotice/GetCANoticeContracts

Exemplu:
  python connectors/seap_harvest.py --authority "MUNICIPIUL BRASOV" --from 2024-01-01 --out data/raw/seap_brasov.json
Necesită doar `requests`. Respectă serverul: ~3 cereri/secundă, pagini de 100.
"""
import argparse, json, sys, time
from datetime import datetime, date

import requests

BASE = "https://e-licitatie.ro"
HDR = {"Content-Type": "application/json", "Accept": "application/json",
       "User-Agent": "watchdog-research/0.1 (+contact: vezi README)"}
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
        sys.exit(f"Autoritatea '{name}' nu a fost găsită în SEAP")
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
        print(f"  achiziții directe: {len(out)}/{j['total']}", file=sys.stderr)
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
        print(f"  anunțuri de atribuire: {len(out)}/{j['total']}", file=sys.stderr)
        if len(out) >= j["total"] or not j["items"]:
            return out
        p += 1; time.sleep(PAUSE)


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
    ap.add_argument("--authority", required=True, help='ex. "MUNICIPIUL BRASOV"')
    ap.add_argument("--from", dest="d_from", default="2024-01-01")
    ap.add_argument("--to", dest="d_to", default=date.today().isoformat())
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    auth = find_authority(a.authority)
    print(f"Autoritate: {auth['name']} (CUI {auth['cui']}, SEAP id {auth['seapId']})", file=sys.stderr)
    da = direct_acquisitions(auth["seapId"], a.d_from, a.d_to)
    notices = award_notices(auth["seapId"], a.d_from, a.d_to)
    contracts = []
    for k, n in enumerate(notices, 1):
        try:
            contracts += contracts_for(n)
        except Exception as e:  # un anunț stricat nu oprește tot lotul
            print(f"  ! contracte {n['caNoticeId']}: {e}", file=sys.stderr)
        if k % 25 == 0:
            print(f"  contracte: {k}/{len(notices)} anunțuri", file=sys.stderr)
        time.sleep(PAUSE)
    payload = {"authority": {k: auth[k] for k in ("seapId", "cui", "name")}, "da": da, "notices": notices,
               "contracts": contracts, "harvested_at": datetime.utcnow().isoformat() + "Z"}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"Scris {a.out}: {len(da)} DA, {len(notices)} anunțuri, {len(contracts)} contracte", file=sys.stderr)


if __name__ == "__main__":
    main()
