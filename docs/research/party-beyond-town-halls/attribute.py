"""Party beyond town halls (#153): how much SEAP awarded value 2021-2026 the MF list's principal credit holder ties to an elected leader.
args: lista_ep_2026.xls lista_ep_2018.xls authority_totals.csv anaf.csv outdir
Downloaded files are untrusted: run with python3 -I."""
import sys; sys.path.insert(0, "/tmp/pb-lib")  # xlrd/openpyxl installed with `uv pip install --target /tmp/pb-lib`
import xlrd, csv, re, collections, unicodedata, random, pathlib

def cui(x):
    s = str(x).strip().upper().replace("RO", "").strip()
    if s.endswith(".0"): s = s[:-2]
    s = s.lstrip("0")
    return s if s.isdigit() else ""

def fold(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9 ]", " ", s)

def read_mf(path, has_vat):
    s = xlrd.open_workbook(path).sheet_by_index(0); o = 1 if has_vat else 0; out = {}
    for r in range(1, s.nrows):
        v = s.row_values(r)
        out[cui(v[1])] = dict(county=v[0], name=v[2 + o], uat=v[3 + o], p1=cui(v[5 + o]), p1n=v[6 + o], p2=cui(v[7 + o]), p2n=v[8 + o])
    return out

LEAD = re.compile(r"^(COMUNA|ORAS|ORASUL|MUNICIPIUL|MUNICIPIULUI|JUDETUL|SECTORUL ?\d?|PRIMARIA)\b")
mf, mf18 = read_mf(sys.argv[1], True), read_mf(sys.argv[2], False)
leaders = {c for c, r in mf.items() if not r["p1"] and LEAD.match(fold(r["name"]).strip())}
county_leader = {c for c in leaders if fold(mf[c]["name"]).startswith("JUDETUL")}
anaf = {r["cui"]: r for r in csv.DictReader(open(sys.argv[4], encoding="utf-8"))}
out = pathlib.Path(sys.argv[5])

EDU = re.compile(r"\b(SCOALA|LICEUL|COLEGIUL|GRADINITA|GRUPUL SCOLAR|SEMINARUL|PALATUL COPIILOR|CLUBUL COPIILOR|CLUBUL SPORTIV SCOLAR|CENTRUL SCOLAR|LICEU|SCOALA GIMNAZIALA)\b")
COMPANY = re.compile(r"\b(S ?A|S ?R ?L|R ?A|SRL|SA|REGIA|COMPANIA|SOCIETATEA|SC)\b")

def tut(r):
    """the elected-leader principal credit holders among the (up to two) listed"""
    return frozenset(x for x in (r["p1"], r["p2"]) if x in leaders)

def kind(c, name):
    if c in leaders: return "A_county" if c in county_leader else "A_uat"
    r = mf.get(c)
    if r:
        if tut(r):
            school = bool({r["p1"], r["p2"]} - leaders - {""}) or bool(EDU.search(fold(r["name"])))
            return "B_school" if school else "B_other"
        return "C_central_or_other_principal"
    a = anaf.get(c, {})
    n = fold(name or a.get("name", ""))
    if COMPANY.search(n) or "SOCIETATE" in fold(a.get("legal_form", "")) or a.get("reg", "").startswith("J"):
        own = a.get("ownership", "")
        if "STAT" in own or "MIXTA" in own: return "D_company_state_or_public"
        return "D_company_other"
    return "E_not_in_mf"

tot = collections.Counter(); big = collections.Counter(); n = collections.Counter(); rows = []
for r in csv.DictReader(open(sys.argv[3], encoding="utf-8")):
    c = cui(r["cui"] or r["entity_key"]); v = int(r["awarded"] or 0); v2 = int(r["awarded_lt1b"] or 0)
    k = kind(c, r["display_name"]); tot[k] += v; big[k] += v2; n[k] += 1
    rows.append((k, c, r["display_name"], v))
T, T2 = sum(tot.values()), sum(big.values())
print(f"total awarded 2021-2026: {T/1e11:.1f} bn RON; excl. records >=1bn: {T2/1e11:.1f}")
for k in sorted(tot): print(f"{k:32} cuis={n[k]:6} bn={tot[k]/1e11:7.1f} share={tot[k]/T:6.1%} share_lt1b={big[k]/T2:6.1%}")

# consistency: subordinate entity's county equals its principal's county (Bucharest: sector/general both 'Bucuresti')
B = [(k, c) for k, c, _, _ in rows if k.startswith("B_")]
mism = [(c, mf[c]["name"], mf[c]["county"], mf[l]["name"], mf[l]["county"]) for _, c in B for l in tut(mf[c]) if fold(mf[c]["county"]) != fold(mf[l]["county"])]
multi = [(c, mf[c]["name"], mf[c]["p1n"], mf[c]["p2n"]) for _, c in B if len(tut(mf[c])) > 1]
print("B with two elected-leader principals", len(multi)); [print("  ", m) for m in multi[:10]]
print("B authorities", len(B), "county != principal's county", len(mism)); [print("  ", m) for m in mism[:15]]
# stability 2018 -> 2026 for B authorities present in both lists
both = [c for _, c in B if c in mf18]
moved = [(c, mf[c]["name"], mf18[c]["p1n"], mf18[c]["p2n"], mf[c]["p1n"], mf[c]["p2n"]) for c in both if tut(mf18[c]) != tut(mf[c])]
vb = {c: v for k, c, _, v in rows if k.startswith("B_")}
print("B in 2018 list", len(both), "principal changed", len(moved), f"value share {sum(vb[c] for c,*_ in moved)/max(1,sum(vb[c] for c in both)):.2%}")
for m in moved[:40]: print("  ", m)
# entities whose 2018 principal was a leader but 2026 is not (left local tutelage) -- among all SEAP authorities
left = [(c, mf[c]["name"], mf18[c]["p1n"], mf[c]["p1n"], mf[c]["p2n"]) for k, c, _, v in rows if c in mf and c in mf18 and tut(mf18[c]) and not tut(mf[c]) and c not in leaders]
print("principal was a leader in 2018, not in 2026:", len(left)); [print("  ", m) for m in left[:10]]
# top B entities, and a random sample for a manual read
with open(out / "b_top.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["class", "cui", "name", "principal", "principal2", "bn_ron"])
    for k, c, name, v in sorted([x for x in rows if x[0].startswith("B_")], key=lambda x: -x[3])[:60]:
        w.writerow([k, c, name, mf[c]["p1n"], mf[c]["p2n"], round(v / 1e11, 3)])
random.seed(153)
with open(out / "b_sample.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["class", "cui", "name", "mf_uat", "principal", "principal2", "bn_ron"])
    for k, c, name, v in random.sample([x for x in rows if x[0].startswith("B_")], 60):
        w.writerow([k, c, name, mf[c]["uat"], mf[c]["p1n"], mf[c]["p2n"], round(v / 1e11, 4)])
with open(out / "d_top.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["class", "cui", "name", "ownership", "locality", "bn_ron"])
    for k, c, name, v in sorted([x for x in rows if x[0].startswith("D_") or x[0].startswith("E_")], key=lambda x: -x[3])[:80]:
        a = anaf.get(c, {}); w.writerow([k, c, name, a.get("ownership", ""), a.get("locality", ""), round(v / 1e11, 3)])
# hospitals: how the MF principal splits them (the name-based class B of #131 counted all hospitals as local)
H = collections.Counter(); HN = collections.Counter()
for k, c, name, v in rows:
    if "SPITAL" in fold(name) and k[0] in "BC": H[k] += v; HN[k] += 1
print("hospitals by class:", {k: (HN[k], round(H[k] / 1e11, 1)) for k in H})
# central-principal entities that look local by name (possible MF errors or genuinely central)
sus = [(c, name, mf[c]["p1n"], round(v / 1e11, 2)) for k, c, name, v in rows if k.startswith("C_") and re.search(r"\b(PRIMARIA|CONSILIUL LOCAL|CONSILIUL JUDETEAN|DIRECTIA DE ASISTENTA SOCIALA|SERVICIUL PUBLIC)\b", fold(name))]
print("central-principal but local-looking name:", len(sus), round(sum(x[3] for x in sus), 2), "bn"); [print("  ", s) for s in sorted(sus, key=lambda x: -x[3])[:12]]
