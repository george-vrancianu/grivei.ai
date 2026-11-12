"""PROTOTYPE (#136), throwaway. The same name -> CUI rules on POCU 2014-2020 beneficiaries (SMIS naming, CUI given in free text).
Run after seap_rules.py (reuses tables o, alias-free seap, nm, anaf, au in orgmatch.duckdb).
argv: work_dir pocu.tsv"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duckdb, pandas as pd
from norm import norm, strip_form, county

w, pocu = sys.argv[1:3]
c = duckdb.connect(f"{w}/orgmatch.duckdb")
X = c.execute
counties = {r[0] for r in X("SELECT DISTINCT jud FROM o WHERE jud<>''").fetchall()}
rows = []
for line in open(pocu):
    role, raw, cui, jud, val = line.rstrip("\n").split("\t")
    n = norm(raw)
    j = county(jud)
    rows.append((role, n, strip_form(n), cui, j if j in counties else None, float(val or 0)))
df = pd.DataFrame(rows, columns=["role", "name", "bare", "cui", "jud", "val"])
X("""CREATE OR REPLACE TABLE pocu AS SELECT name, any_value(bare) bare, cui, max(jud) jud, sum(val) val, bool_or(role='L') leader FROM df
     WHERE name<>'' GROUP BY name, cui""")
X("""CREATE OR REPLACE TABLE pocu2 AS SELECT p.*, p.cui IN (SELECT cui FROM o) in_onrc, p.cui IN (SELECT cui FROM anaf) in_anaf,
       p.cui IN (SELECT cui FROM au) is_authority,
       CASE WHEN p.cui IN (SELECT cui FROM o) THEN 'company (in ONRC)'
            WHEN p.cui IN (SELECT cui FROM au) THEN 'public body (SEAP authority)'
            WHEN regexp_matches(p.name, '^(ASOCIATIA|FUNDATIA|FEDERATIA|UNIUNEA|CLUBUL|ORGANIZATIA|PATRONATUL|SINDICATUL|LIGA|ALIANTA|CAMERA|COLEGIUL|ORDINUL|CORPUL)\\b|\\b(ASOCIATIA|FUNDATIA)\\b') THEN 'NGO / association (not in ONRC)'
            ELSE 'other / unknown' END kind
     FROM pocu p""")
print(X("SELECT count(*), count(DISTINCT cui), count(jud), sum(leader::int) FROM pocu2").fetchone(), "pairs (name, CUI) / CUIs / with single county / leaders")
print(X("SELECT kind, count(*) n FROM pocu2 GROUP BY 1 ORDER BY 2 DESC").fetchdf().to_string(index=False))

X("""CREATE OR REPLACE TABLE alias_all AS SELECT DISTINCT n.name, n.bare, s.cui, a.jud FROM seap s JOIN nm n USING (raw) JOIN anaf a USING (cui) WHERE n.name<>''""")
X("CREATE OR REPLACE TABLE auidx AS SELECT DISTINCT name, cui, jud FROM au")
RULES = {
    "r1 name+form, all ONRC": ("SELECT name k, cui FROM o", "name"),
    "r2 name+form, not struck off": ("SELECT name k, cui FROM o WHERE struck=0", "name"),
    "r3 name+form + county": ("SELECT name||'|'||jud k, cui FROM o", "name||'|'||jud"),
    "r4 name without form + county": ("SELECT bare||'|'||jud k, cui FROM o", "bare||'|'||jud"),
    "r1x name without form, all ONRC": ("SELECT bare k, cui FROM o", "bare"),
    "r5 r1 + SEAP supplier alias index (all years)": ("SELECT name k, cui FROM o UNION SELECT name, cui FROM alias_all", "name"),
    "r6 SEAP authority names, name only": ("SELECT name k, cui FROM auidx", "name"),
    "r6c SEAP authority names + county": ("SELECT name||'|'||jud k, cui FROM auidx", "name||'|'||jud"),
    "r7 union: ONRC + supplier aliases + authority names": ("SELECT name k, cui FROM o UNION SELECT name, cui FROM alias_all UNION SELECT name, cui FROM auidx", "name"),
}


def run(label, where):
    out = []
    for rule, (src, key) in RULES.items():
        X(f"CREATE OR REPLACE TEMP TABLE idx AS SELECT DISTINCT k, cui FROM ({src}) WHERE k IS NOT NULL")
        r = dict(X(f"""WITH g AS (SELECT *, {key} k FROM pocu2 WHERE {where}),
              m AS (SELECT g.name, g.cui, count(i.cui) n, bool_or(i.cui=g.cui) hit FROM g LEFT JOIN idx i ON i.k=g.k GROUP BY 1,2)
            SELECT CASE WHEN n=0 THEN 'no match' WHEN n=1 AND hit THEN 'unique correct' WHEN n=1 THEN 'unique WRONG' ELSE 'ambiguous' END, count(*)
            FROM m GROUP BY 1""").fetchall())
        N = sum(r.values()) or 1
        row = {"rule": rule, **{k: round(100 * r.get(k, 0) / N, 1) for k in ["unique correct", "unique WRONG", "ambiguous", "no match"]}}
        row["WRONG / all unique %"] = round(100 * r.get("unique WRONG", 0) / max(r.get("unique WRONG", 0) + r.get("unique correct", 0), 1), 1)
        out.append(row)
    print(f"\n## POCU: {label}  (N = {N} pairs; % of pairs)")
    print(pd.DataFrame(out).to_string(index=False))


run("all (name, CUI) pairs", "true")
run("company beneficiaries (CUI in ONRC)", "in_onrc")
run("company beneficiaries with a single county (county-keyed rules apply)", "in_onrc AND jud IS NOT NULL")
run("public bodies (CUI is a SEAP authority)", "kind='public body (SEAP authority)'")
run("public bodies with a single county", "kind='public body (SEAP authority)' AND jud IS NOT NULL")
run("NGOs / associations", "kind='NGO / association (not in ONRC)'")
