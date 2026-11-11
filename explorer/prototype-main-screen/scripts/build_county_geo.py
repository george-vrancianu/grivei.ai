#!/usr/bin/env python3
"""PROTOTYPE, throwaway. Builds src/countygeo.json for the zoomed-county prototype (issue #25).

Inputs (all downloaded earlier; see README):
  siruta.csv            INS SIRUTA S1 2026 (CC BY 4.0)
  wd_siruta.csv         Wikidata P843/P625 snapshot (CC0), columns s,c
  uat_*.geojson         ANCPI AU FeatureServer/1, outSR=4326, maxAllowableOffset=0.0015 (CC BY 4.0)
  anaf_all.json         ANAF v9 answers for every Q3 2026 authority CUI
  da.xlsx, contracts.xlsx  ADR "Achizitii directe TIII 2026" and "Contracte TIII 2026"

Usage: python3 -I scripts/build_county_geo.py <siruta.csv> <wd_siruta.csv> <anaf_all.json> <da.xlsx> <contracts.xlsx> <uat.geojson>...
"""
import collections, csv, json, re, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import shape, mapping, Point, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid

OUT = Path(__file__).resolve().parent.parent / "src" / "countygeo.json"
siruta_p, wd_p, anaf_p, da_p, ct_p, *uat_ps = sys.argv[1:]

# ---------- SIRUTA
rows = list(csv.DictReader(open(siruta_p, encoding="utf-8-sig"), delimiter=";"))
by = {r["SIRUTA"]: r for r in rows}
kids = collections.defaultdict(list)
for r in rows:
    kids[r["SIRSUP"]].append(r)

def fold(s, i_fold=False):
    s = s.upper()
    if i_fold:
        s = s.replace("Â", "I").replace("Î", "I")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\s*\.\s*", ".", s)
    return re.sub(r"[\s\-]+", " ", s).strip()

uat_ix = {}
for r in rows:
    if r["NIV"] != "2":
        continue
    t, d = int(r["TIP"]), r["DENLOC"]
    kind = "Mun." if t in (1, 4) else "Orş." if t in (2, 5) else "Com." if t == 3 else None
    bare = re.sub(r"^(MUNICIPIUL|ORAŞ|ORAȘ) ", "", d)
    for f in (False, True):
        uat_ix[(r["JUD"], kind, fold(bare, f))] = r

ALIAS = {"VARTOAPELE": "VARTOAPE"}
def match(jud, loc):
    m = re.match(r"^Sector (\d) Mun\. Bucureşti$", loc)
    if m:
        return [r for r in rows if r["TIP"] == "6" and r["DENLOC"].endswith(" " + m.group(1))][0], None
    m = re.match(r"^(?:(Sat|Loc\.) (.+?) )?(Mun\.|Orş\.|Com\.) (.+)$", loc)
    if not m:
        return None, None
    _, sub, kind, name = m.groups()
    u = None
    for f in (False, True):
        n = fold(name, f)
        u = uat_ix.get((jud, kind, ALIAS.get(n, n)))
        if u:
            break
    if not u:
        return None, None
    if not sub:
        return u, None
    for f in (False, True):
        c = [k for k in kids[u["SIRUTA"]] if fold(k["DENLOC"], f) == fold(sub, f)]
        if len(c) == 1:
            return u, c[0]
    return u, None

# ---------- authorities: ANAF locality + county
anaf = json.load(open(anaf_p))["found"]
jud_iso, auth = {}, {}
for x in anaf:
    a, g = x["adresa_sediu_social"], x["date_generale"]
    iso = "RO-" + a["scod_JudetAuto"] if a["scod_JudetAuto"] else None
    if a["scod_Judet"] and iso:
        jud_iso[a["scod_Judet"]] = iso
    u, v = match(a["scod_Judet"], a["sdenumire_Localitate"])
    auth[str(g["cui"])] = {"cui": str(g["cui"]), "name": g["denumire"], "county": iso,
                           "uat": u["SIRUTA"] if u else None, "village": v["SIRUTA"] if v else None,
                           "anafLoc": a["sdenumire_Localitate"]}

# ---------- money: Q3 2026, awarded value; framework ceilings out
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
def xlsx_rows(p):
    z = zipfile.ZipFile(p); ss = []
    for _, el in ET.iterparse(z.open("xl/sharedStrings.xml")):
        if el.tag == NS + "si":
            ss.append("".join(t.text or "" for t in el.iter(NS + "t"))); el.clear()
    sheet = sorted(n for n in z.namelist() if n.startswith("xl/worksheets/sheet"))[0]
    for _, el in ET.iterparse(z.open(sheet)):
        if el.tag != NS + "row":
            continue
        vals = {}
        for c in el.findall(NS + "c"):
            v = c.find(NS + "v")
            vals[re.match(r"[A-Z]+", c.get("r")).group(0)] = "" if v is None else (ss[int(v.text)] if c.get("t") == "s" else v.text)
        el.clear()
        yield vals

money = collections.defaultdict(lambda: {"value": 0.0, "n": 0})
seen = set()
for i, r in enumerate(xlsx_rows(da_p)):
    if i == 0 or r.get("C") in seen:
        continue
    seen.add(r.get("C"))
    m = money[r.get("B", "").strip()]; m["value"] += float(r.get("L") or 0); m["n"] += 1
for i, r in enumerate(xlsx_rows(ct_p)):
    k = (r.get("N"), r.get("Q"))
    if i == 0 or k in seen or "cadru" in (r.get("H") or "").lower():
        continue
    seen.add(k)
    m = money[r.get("B", "").strip()]; m["value"] += float(r.get("S") or 0); m["n"] += 1

NATIONAL = re.compile(r"^(MINISTERUL|AGENTIA NATIONALA|COMPANIA NATIONALA|AUTORITATEA NATIONALA|ADMINISTRATIA NATIONALA|"
                      r"INSPECTORATUL GENERAL|CASA NATIONALA|OFICIUL NATIONAL|INSTITUTUL NATIONAL|SECRETARIATUL GENERAL|"
                      r"SERVICIUL (ROMAN|DE TELECOMUNICATII|DE PROTECTIE)|CNAIR|STATUL MAJOR|GUVERNUL|CURTEA DE CONTURI|"
                      r"SOCIETATEA NATIONALA|REGIA AUTONOMA ADMINISTRATIA PATRIMONIULUI|PARLAMENTUL|CAMERA DEPUTATILOR|SENATUL)")
KIND = [("hall", r"\b(PRIMARIA|MUNICIPIUL|ORASUL|COMUNA|CONSILIUL (JUDETEAN|LOCAL)|JUDETUL|UAT)\b"),
        ("school", r"\b(SCOALA|LICEUL|COLEGIUL|GRADINITA|UNIVERSITATEA|CLUBUL SPORTIV|PALATUL COPIILOR|SEMINARUL|INSPECTORATUL SCOLAR)\b"),
        ("health", r"\b(SPITALUL|AMBULANTA|SANATATE|SANATOR|MEDICAL|DSP|CASA (JUDETEANA )?DE ASIGURARI)"),
        ("order", r"\b(POLITIA|POLITIEI|JANDARM|SITUATII DE URGENTA|ISU|PENITENCIARUL|UNITATEA MILITARA|TRIBUNALUL|JUDECATORIA|PARCHETUL)"),
        ("utility", r"\b(S\.?A\.?|S\.?R\.?L\.?|REGIA|APA|TRANSPORT|TERMO|SALUBR|ADMINISTRATIA)\b")]
def kind(name):
    n = fold(name)
    return next((k for k, p in KIND if re.search(p, n)), "other")

# ---------- geometry
feats = [f for p in uat_ps for f in json.load(open(p))["features"]]
uat_geom = {f["properties"]["nationalCode"]: make_valid(shape(f["geometry"])).buffer(0) for f in feats}
wd = {}
for r in csv.DictReader(open(wd_p)):
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["c"] or "")
    if m:
        wd.setdefault(r["s"], (float(m.group(1)), float(m.group(2))))

def r4(c):
    return [r4(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 4), round(c[1], 4)]

counties = collections.defaultdict(lambda: {"uats": [], "authorities": [], "unplaced": [], "national": []})
point_src = collections.Counter()
for code, g in uat_geom.items():
    s = by[code]
    iso = jud_iso.get(s["JUD"])
    p = wd.get(code)
    if p and g.contains(Point(p)):
        point_src["wikidata"] += 1
    else:
        point_src["ancpi_pos"] += 1
        q = g.representative_point(); p = (q.x, q.y)
    name = re.sub(r"^(MUNICIPIUL|ORAŞ) ", "", s["DENLOC"]).title()
    counties[iso]["uats"].append({"siruta": code, "name": name, "tip": int(s["TIP"]), "pt": r4(p),
                                  "geom": {"type": g.geom_type, "coordinates": r4(mapping(g)["coordinates"])}})

village_ok = collections.Counter()
for a in auth.values():
    m = money.get(a["cui"])
    if not m or not a["county"]:
        continue
    rec = {"cui": a["cui"], "name": a["name"], "value": round(m["value"]), "n": m["n"], "kind": kind(a["name"]),
           "uat": a["uat"], "loc": a["anafLoc"]}
    if a["village"]:
        p = wd.get(a["village"]); g = uat_geom.get(a["uat"])
        ok = p and g and g.buffer(0.01).contains(Point(p))
        village_ok[bool(ok)] += 1
        if ok:
            rec["village"] = a["village"]; rec["vname"] = by[a["village"]]["DENLOC"].title(); rec["vpt"] = r4(p)
    c = counties[a["county"]]
    if NATIONAL.match(fold(a["name"])):
        c["national"].append(rec)
    elif a["uat"] and a["uat"] in uat_geom:
        c["authorities"].append(rec)
    else:
        c["unplaced"].append(rec)

# Unplaced demo: ANAF found every authority, so also carry the one CUI ANAF missed and anything unparsed.
outline = {}
for iso, c in counties.items():
    u = unary_union([uat_geom[x["siruta"]] for x in c["uats"]]).buffer(0.003).buffer(-0.003)  # close simplification slivers
    parts = [Polygon(g.exterior) for g in getattr(u, "geoms", [u]) if g.area > 1e-5]
    u = (parts[0] if len(parts) == 1 else MultiPolygon(parts)).simplify(0.002)
    outline[iso] = {"type": u.geom_type, "coordinates": r4(mapping(u)["coordinates"])}

json.dump({"counties": counties, "ancpiOutline": outline}, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
n_auth = sum(len(c["authorities"]) for c in counties.values())
print(f"{len(uat_geom)} UATs ({dict(point_src)}), {n_auth} placed authorities with money, "
      f"{sum(len(c['unplaced']) for c in counties.values())} unplaced, {sum(len(c['national']) for c in counties.values())} national; "
      f"village points ok/bad {dict(village_ok)}; {OUT.stat().st_size/1e6:.1f} MB")
