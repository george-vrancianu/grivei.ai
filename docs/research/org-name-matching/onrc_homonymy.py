"""PROTOTYPE (#136), throwaway. ONRC homonymy: share of normalised names that map to more than one CUI.
argv: work_dir (with onrc.tsv from prep.py)"""
import sys, duckdb
w = sys.argv[1]
c = duckdb.connect(f"{w}/orgmatch.duckdb")
c.execute(f"""CREATE OR REPLACE TABLE onrc AS SELECT * FROM read_csv('{w}/onrc.tsv', delim='\t', header=false, quote='', escape='',
  columns={{'cui':'VARCHAR','reg':'VARCHAR','name':'VARCHAR','bare':'VARCHAR','forma':'VARCHAR','jud':'VARCHAR','loc':'VARCHAR','struck':'INT','yr':'VARCHAR'}})""")
c.execute("CREATE OR REPLACE TABLE o AS SELECT *, forma IN ('PFA','II','IF','PF') person_form FROM onrc WHERE cui IS NOT NULL AND cui<>'' AND name<>''")
print(c.execute("""SELECT count(*) rows, count(*) FILTER (WHERE cui IS NULL OR cui='') no_cui,
   count(*) FILTER (WHERE struck=1) struck FROM onrc""").fetchone(), "rows / blank-or-0 CUI / struck (1084)")
print(c.execute("SELECT count(*), count(DISTINCT cui), count(DISTINCT cui) FILTER (WHERE struck=0) FROM o").fetchone(), "rows with CUI / distinct CUIs / distinct not-struck CUIs")

def homonymy(namecol, keyextra, where):
    key = ", ".join([namecol] + keyextra)
    return c.execute(f"""WITH k AS (SELECT {key}, count(DISTINCT cui) n FROM o WHERE {where} GROUP BY ALL),
        f AS (SELECT DISTINCT cui, {key} FROM o WHERE {where})
      SELECT (SELECT count(*) FROM k), (SELECT avg((n>1)::int) FROM k),
             (SELECT avg((k.n>1)::int) FROM f JOIN k USING ({key})), (SELECT max(n) FROM k)""").fetchone()

rows = []
for scope, where in [("all", "true"), ("not struck off", "struck=0"), ("all, excl. PFA/II/IF/PF", "NOT person_form"),
                     ("not struck off, excl. PFA/II/IF/PF", "struck=0 AND NOT person_form")]:
    for namecol, label in [("name", "with legal form"), ("bare", "legal form removed")]:
        for extra, kl in [([], "name"), (["jud"], "name + county"), (["jud", "loc"], "name + county + locality")]:
            k, share_keys, share_cuis, mx = homonymy(namecol, extra, where)
            rows.append((scope, label, kl, k, round(100 * share_keys, 2), round(100 * share_cuis, 2), mx))
import pandas as pd
print(pd.DataFrame(rows, columns=["scope", "name", "key", "distinct keys", "% keys >1 CUI", "% CUIs sharing key", "max CUIs/key"]).to_string(index=False))

# kinds of homonyms among names (with legal form) that map to >1 CUI: classify each extra CUI against the earliest one
print("\n## homonym kinds (name with legal form, all registrations): pairs (first-registered CUI, each later CUI)")
print(c.execute("""
 WITH f AS (SELECT name, cui, min(yr) yr, bool_and(struck=1) struck, min(jud) jud, any_value(forma) forma FROM o WHERE yr<>'' GROUP BY 1,2),
      r AS (SELECT *, row_number() OVER (PARTITION BY name ORDER BY yr, cui) rk, count(*) OVER (PARTITION BY name) n FROM f),
      p AS (SELECT a.name, a.yr y1, b.yr y2, a.struck s1, b.struck s2, a.jud=b.jud same_county, a.forma=b.forma same_form, a.forma f1
            FROM r a JOIN r b ON a.name=b.name AND a.rk=1 AND b.rk>1)
 SELECT CASE WHEN f1 IN ('PFA','II','IF','PF') THEN 'person-named (PFA/II/IF/PF)'
             WHEN y1<'2000' AND y2<'2000' AND NOT same_county THEN 'both pre-2000, different counties'
             WHEN s1 AND NOT s2 THEN 'earlier one struck off, later one live (name reused)'
             WHEN s1 AND s2 THEN 'both struck off'
             WHEN NOT s1 AND NOT s2 AND NOT same_county THEN 'both live, different counties'
             WHEN NOT s1 AND NOT s2 THEN 'both live, same county'
             ELSE 'earlier live, later struck off' END kind,
        count(*) pairs, round(100.0*count(*)/sum(count(*)) OVER (),1) pct
 FROM p GROUP BY 1 ORDER BY 2 DESC""").fetchdf().to_string(index=False))
print("\n## live-live homonyms (excl. person forms): registration-year bucket of the later CUI")
print(c.execute("""
 WITH f AS (SELECT name, cui, min(yr) yr, any_value(forma) forma FROM o WHERE struck=0 AND yr<>'' AND NOT person_form GROUP BY 1,2),
      m AS (SELECT name FROM f GROUP BY 1 HAVING count(*)>1)
 SELECT CASE WHEN max(yr)<'2000' THEN 'all pre-2000' WHEN min(yr)>='2010' THEN 'all 2010+' ELSE 'mixed' END b, count(*) names
 FROM f JOIN m USING (name) GROUP BY name ORDER BY 1""").fetchdf().groupby('b').size().to_string())
