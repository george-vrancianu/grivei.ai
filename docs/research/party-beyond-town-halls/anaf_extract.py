"""Extract per-CUI ownership form, legal form and seat locality from archived ANAF v9 responses (newest per CUI)."""
import sys, json, csv, pathlib
root = pathlib.Path(sys.argv[1]); out = {}
for f in sorted(root.glob("*/*/response.json")):
    try: d = json.loads(f.read_text())
    except Exception: continue
    for x in d.get("found", []) or []:
        g = x.get("date_generale", {}); s = x.get("adresa_sediu_social", {})
        out[str(g.get("cui"))] = (g.get("denumire",""), g.get("forma_de_proprietate",""), g.get("forma_juridica",""), g.get("forma_organizare",""), g.get("nrRegCom",""), g.get("cod_CAEN",""), s.get("sdenumire_Localitate",""), s.get("scod_JudetAuto",""))
w = csv.writer(sys.stdout); w.writerow(["cui","name","ownership","legal_form","org_form","reg","caen","locality","county"])
for k, v in out.items(): w.writerow([k, *v])
