"""PROTOTYPE (#136), throwaway. Normalise ONRC firms and archived ANAF answers into TSVs for DuckDB.
argv: od_firme.csv od_stare_firma.csv anaf_vat_dir out_dir"""
import sys, os, json, pathlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from norm import norm, strip_form, county, locality

firme, stare, anaf_dir, out = sys.argv[1:5]
STRUCK = {"1084"}  # radiata
struck = set()
with open(stare, encoding="utf-8-sig", errors="replace") as f:
    f.readline()
    for line in f:
        p = line.rstrip("\r\n").split("^")
        if len(p) >= 2 and p[1].strip() in STRUCK:
            struck.add(p[0].strip())
print("struck registrations", len(struck), file=sys.stderr)

with open(firme, encoding="utf-8-sig", errors="replace", newline="") as f, open(f"{out}/onrc.tsv", "w") as o:
    h = f.readline().rstrip("\r\n").split("^")
    ix = {k: h.index(k) for k in ["DENUMIRE", "CUI", "COD_INMATRICULARE", "DATA_INMATRICULARE", "FORMA_JURIDICA", "ADR_JUDET", "ADR_LOCALITATE"]}
    n = bad = 0
    for line in f:
        p = line.rstrip("\r\n").split("^")
        if len(p) != len(h):
            bad += 1; continue
        cui = p[ix["CUI"]].strip()
        cui = str(int(cui)) if cui.isdigit() and int(cui) > 0 else ""
        nm = norm(p[ix["DENUMIRE"]]); reg = p[ix["COD_INMATRICULARE"]].strip()
        d = p[ix["DATA_INMATRICULARE"]].strip()
        yr = d[6:10] if len(d) >= 10 else ""
        o.write("\t".join([cui, reg, nm, strip_form(nm), p[ix["FORMA_JURIDICA"]].strip(), county(p[ix["ADR_JUDET"]]),
                           locality(p[ix["ADR_LOCALITATE"]]), "1" if reg in struck else "0", yr]) + "\n")
        n += 1
print("onrc rows", n, "bad", bad, file=sys.stderr)

with open(f"{out}/anaf.tsv", "w") as o:
    n = 0
    for resp in pathlib.Path(anaf_dir).glob("*/*/response.json"):
        d = json.load(open(resp))
        for r in d.get("found", []):
            g = r["date_generale"]; a = r.get("adresa_sediu_social") or {}
            rad = "1" if (r.get("stare_inactiv") or {}).get("dataRadiere") or "RADIERE" in (g.get("stare_inregistrare") or "") else "0"
            o.write("\t".join([str(g["cui"]), norm(g.get("denumire")), county(a.get("sdenumire_Judet")), a.get("scod_JudetAuto") or "",
                               locality(a.get("sdenumire_Localitate")), rad]) + "\n")
            n += 1
print("anaf found", n, file=sys.stderr)
