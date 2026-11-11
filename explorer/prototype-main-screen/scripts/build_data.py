#!/usr/bin/env python3
"""PROTOTYPE, throwaway. Builds src/data.json and src/counties.json for the main-screen prototype.

Usage: python3 -I scripts/build_data.py <geoBoundaries-ROU-ADM1_simplified.geojson> <raw batch>...
"""
import json, re, sys, unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src"
geo_path, batches = sys.argv[1], sys.argv[2:]

# --- counties: round coordinates to shrink the file; key on ISO 3166-2:RO
geo = json.load(open(geo_path))
def rnd(c):
    return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 3), round(c[1], 3)]
counties = {"type": "FeatureCollection", "features": []}
name_to_iso = {}
for f in geo["features"]:
    p = f["properties"]
    name_to_iso[p["shapeName"].replace(" ", "-")] = p["shapeISO"]
    counties["features"].append({"type": "Feature",
        "properties": {"iso": p["shapeISO"], "name": p["shapeName"].title()},
        "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}})

def county_iso(name):
    if not name:
        return None
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper().strip().replace(" ", "-")
    n = {"BUCHAREST": "BUCURESTI", "MUNICIPIUL-BUCURESTI": "BUCURESTI"}.get(n, n)
    return name_to_iso.get(n)

AUTH_COUNTY = {"4384206": "RO-BV", "14756536": "RO-TM"}  # placed by hand for the prototype
authorities, suppliers, records = {}, {}, []

def supplier(cui, name, iso=None):
    cui = re.sub(r"[^0-9]", "", cui or "") or name.strip()  # same rule as norm_cui()
    s = suppliers.setdefault(cui, {"cui": cui, "name": name.strip(), "county": None})
    if iso and not s["county"]:
        s["county"] = iso
    return cui

for path in batches:
    d = json.load(open(path))
    a = d["authority"]
    authorities[a["cui"]] = {"cui": a["cui"], "name": a["name"], "county": AUTH_COUNTY.get(a["cui"]), "scope": "local"}
    for c in d["contracts"]:
        winners = [supplier(w.get("cui") or w["name"], w["name"], county_iso(w.get("county"))) for w in c["winners"]]
        n = next((x for x in d["notices"] if x["caNoticeId"] == c["caNoticeId"]), {})
        records.append({"kind": "contract", "code": c["noticeNo"], "title": c["title"], "cpv": n.get("cpv", ""),
            "proc": n.get("procType", ""), "value": c.get("valueRon") or 0, "date": (c.get("date") or "")[:10],
            "authority": a["cui"], "suppliers": winners,
            "url": f"https://e-licitatie.ro/pub/notices/ca-notices/view-c/{c['caNoticeId']}"})
    for x in d["da"]:
        if x["state"] != "Oferta acceptata":
            continue
        m = re.match(r"\s*(?:RO\s*)?(\d+)\s+(.*)", x["supplier"] or "")
        cui, name = (m.group(1), m.group(2)) if m else (x["supplier"], x["supplier"])
        records.append({"kind": "direct", "code": x["code"], "title": x["name"], "cpv": x["cpv"], "proc": "Achiziție directă",
            "value": x["val"] or 0, "date": (x["fin"] or "")[:10], "authority": a["cui"], "suppliers": [supplier(cui, name)],
            "url": f"https://e-licitatie.ro/pub/direct-acquisition/view/{x['id']}"})

json.dump(counties, open(OUT / "counties.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"authorities": list(authorities.values()), "suppliers": list(suppliers.values()), "records": records},
          open(OUT / "data.json", "w"), ensure_ascii=False, separators=(",", ":"))
known = sum(1 for s in suppliers.values() if s["county"])
print(f"{len(authorities)} authorities, {len(suppliers)} suppliers ({known} with county), {len(records)} records")
