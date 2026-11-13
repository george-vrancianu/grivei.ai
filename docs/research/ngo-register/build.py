"""PROTOTYPE (#151), throwaway. Inputs are hard-coded /tmp paths: /tmp/ngo-work.tsv (extract.py), /tmp/ngo-mfid.tsv (mf_ident.py), /tmp/ngo-euben.tsv (eu_extract.py) and the read-only scratch DBs from #127 (/tmp/sig127). Load the NGO register, MF NGO-named taxpayers, SEAP suppliers and SMIS beneficiaries into one scratch DuckDB. argv: work_dir"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duckdb, pandas as pd
from norm import norm, county, locality

w = sys.argv[1]
NGOW = re.compile(r"\b(ASOCIATIA|ASOCIATIE|FUNDATIA|FUNDATIE|FEDERATIA|UNIUNEA|ASOC|ONG)\b")
def bare(n): return " ".join(t for t in n.split() if t not in {"ASOCIATIA", "ASOCIATIE", "FUNDATIA", "FUNDATIE", "ASOC", "ONG", "SI"})
def isngo(n): return bool(NGOW.search(n))
c = duckdb.connect(f"{w}/ngo.duckdb"); X = c.execute

rows = []
for line in open("/tmp/ngo-work.tsv"):
    kind, raw, rn, st, jud, loc, adr, hg = (line.rstrip("\n").split("\t") + [""] * 8)[:8]
    n = norm(raw); rows.append((kind.split("_")[-1].replace(".xlsx", "")[10:] or kind, raw, n, bare(n), rn, st, county(jud), locality(loc), hg))
mj = pd.DataFrame(rows, columns=["kind", "raw", "name", "bare", "rn", "status", "jud", "loc", "hg"])
X("CREATE OR REPLACE TABLE mj AS SELECT * FROM mj")

rows = []
for line in open("/tmp/ngo-mfid.tsv"):
    p = line.rstrip("\n").split("\t")
    cui, raw, parent, tipu, tipc, jud, loc, dreg, drad, st, act = p[:11]
    n = norm(raw); rows.append((int(cui) if cui.isdigit() else None, raw, n, bare(n), parent, tipu, tipc, county(jud), locality(loc), drad != "", st, act))
mf = pd.DataFrame(rows, columns=["cui", "raw", "name", "bare", "parent", "tipu", "tipc", "jud", "loc", "struck", "stare", "act"])
X("CREATE OR REPLACE TABLE mf AS SELECT * FROM mf WHERE cui IS NOT NULL AND tipc<>'PF'")

X("ATTACH '/tmp/sig127/base.duckdb' AS base (READ_ONLY)")
X("ATTACH '/tmp/sig127/onrc/onrc.duckdb' AS onrc (READ_ONLY)")
X("ATTACH '/tmp/sig127-pnrr/work.duckdb' AS pw (READ_ONLY)")
X("CREATE OR REPLACE TABLE onrc_cui AS SELECT DISTINCT cui::BIGINT cui FROM onrc.onrc")
X("CREATE OR REPLACE TABLE auth AS SELECT DISTINCT cui::BIGINT cui FROM pw.auth")
ent = X("SELECT identity, cui, display_name, county_iso FROM base.entity").fetchdf()
ent["name"] = ent.display_name.map(norm); ent["bare"] = ent.name.map(bare); ent["ngo"] = ent.name.map(isngo)
X("CREATE OR REPLACE TABLE ent AS SELECT * FROM ent")
# supplier value since 2021 per CUI / name-only key
X("""CREATE OR REPLACE TABLE supval AS SELECT winner_key key, sum(counted_bani/100.0/greatest(n_winners,1)) ron, count(DISTINCT code) recs
     FROM base.w GROUP BY 1""")
# ISO county -> MF county name, by majority over shared CUIs
X("""CREATE OR REPLACE TABLE isomap AS SELECT county_iso, arg_max(jud, n) jud FROM (
       SELECT e.county_iso, m.jud, count(*) n FROM ent e JOIN mf m ON m.cui=e.cui::BIGINT WHERE e.county_iso IS NOT NULL GROUP BY 1,2) GROUP BY 1""")

rows = []
for line in open("/tmp/ngo-euben.tsv"):
    prog, role, raw, cui, jud, val = line.rstrip("\n").split("\t")
    n = norm(raw); rows.append((prog, role, raw, n, bare(n), int(cui) if cui else None, county(jud), float(val or 0), isngo(n)))
eu = pd.DataFrame(rows, columns=["prog", "role", "raw", "name", "bare", "cui", "jud", "val", "ngo"])
X("CREATE OR REPLACE TABLE eu AS SELECT * FROM eu WHERE name<>''")

import gzip, json
pr = json.load(gzip.open("/tmp/sig127-pnrr/dl/20261015-progres_tehnic_proiecte.json.gz"))
pn = pd.DataFrame([(r.get("denumire_beneficiar") or "", int(r["cui"]) if (r.get("cui") or "").isdigit() else None, r.get("tip_beneficiar") or "",
                    float(r.get("valoare_total") or 0)) for r in pr], columns=["raw", "cui", "tip", "val"])
pn["name"] = pn.raw.map(norm); pn["ngo"] = pn.name.map(isngo)
X("CREATE OR REPLACE TABLE pnrr AS SELECT * FROM pn")
for t in ["mj", "mf", "ent", "eu", "pnrr", "isomap"]:
    print(t, X(f"SELECT count(*) FROM {t}").fetchone()[0])
