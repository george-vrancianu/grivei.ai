"""Measurements for #151 on the scratch DuckDB built by build.py. Prints Markdown-ish tables."""
import duckdb
c = duckdb.connect("/tmp/ngo-work/ngo.duckdb"); X = c.execute
X("ATTACH '/tmp/sig127/base.duckdb' AS base (READ_ONLY)")
X("CREATE OR REPLACE TABLE entk AS SELECT key, identity, cui, display_name FROM base.entity")
P = lambda q: print(X(q).fetchdf().to_string(index=False), "\n")

X("""CREATE OR REPLACE TABLE mj2 AS SELECT *, regexp_extract(rn, '^\\s*\\d+\\s*/\\s*([A-Z])\\s*/', 1) sec,
      TRY_CAST(regexp_extract(rn, '/\\s*([12]\\d{3})\\s*$', 1) AS INT) yr FROM mj""")
print("## MJ register sections (letter in RN number), status, gaps")
P("""SELECT sec, count(*) rows_, count(DISTINCT rn) rn_numbers, sum((status='')::int) no_status_active, sum((status='radiata')::int) struck,
      sum((status IN ('in lichidare','dizolvata'))::int) dissolving, sum((jud='')::int) no_county, sum((hg<>'')::int) public_utility,
      sum((name NOT SIMILAR TO '.*(ASOCIATIA|FUNDATIA|FEDERATIA|UNIUNEA|ASOCIATIE|FUNDATIE|ASOC).*')::int) no_form_word FROM mj2 GROUP BY 1 ORDER BY 2 DESC""")
P("SELECT count(*) FILTER (WHERE yr IS NULL) no_year, min(yr), max(yr), count(*) FILTER (WHERE yr>=2021) since2021 FROM mj2")
P("SELECT yr, count(*) n FROM mj2 WHERE yr>=2019 AND yr<=2026 GROUP BY 1 ORDER BY 1")
print("## MJ homonymy: share of keys mapping to >1 RN number")
for lab, key, where in [("name, all", "name", "true"), ("name, not struck", "name", "status<>'radiata'"), ("name+county, all", "name||'|'||jud", "jud<>''"),
                        ("bare name+county, all", "bare||'|'||jud", "jud<>''")]:
    P(f"""SELECT '{lab}' key, count(*) keys, round(100.0*avg((n>1)::int),2) pct_keys_multi, sum(CASE WHEN n>1 THEN n END) rows_sharing
         FROM (SELECT {key} k, count(DISTINCT rn) n FROM mj2 WHERE {where} GROUP BY 1)""")

print("## MF NGO-named taxpayers")
P("""SELECT count(*) cuis, sum(struck::int) struck, sum((name LIKE '%PROPRIETARI%')::int) homeowner_assoc, sum((tipu<>'Sediu central')::int) branches,
      sum((cui IN (SELECT cui FROM onrc_cui))::int) also_in_onrc FROM mf""")
P("SELECT stare, count(*) FROM mf GROUP BY 1 ORDER BY 2 DESC LIMIT 6")
X("CREATE OR REPLACE TABLE mfx AS SELECT * FROM mf WHERE name NOT LIKE '%PROPRIETARI%'")

# indices
IDX = {
 "MF m1 exact name": ("SELECT name k, cui id FROM mf", "name"),
 "MF m2 name+seat county": ("SELECT name||'|'||jud k, cui id FROM mf", "name||'|'||jud"),
 "MF m3 bare name+seat county": ("SELECT bare||'|'||jud k, cui id FROM mf", "bare||'|'||jud"),
 "MF m4 bare name, no county": ("SELECT bare k, cui id FROM mf", "bare"),
}
def run(label, gt):
    X(f"CREATE OR REPLACE TEMP TABLE g AS {gt}")
    X("CREATE OR REPLACE TEMP TABLE g AS SELECT name, any_value(bare) bare, cui, CASE WHEN count(DISTINCT jud)=1 THEN any_value(jud) ELSE '' END jud FROM g GROUP BY name, cui")
    N = X("SELECT count(*) FROM g").fetchone()[0]
    print(f"### {label} (N={N} distinct (name, CUI) pairs; % of pairs)")
    out = []
    for r, (src, key) in IDX.items():
        X(f"CREATE OR REPLACE TEMP TABLE idx AS SELECT DISTINCT k, id FROM ({src}) WHERE k IS NOT NULL")
        d = dict(X(f"""WITH gg AS (SELECT *, {key} k FROM g), m AS (SELECT gg.name, gg.cui, count(i.id) n, bool_or(i.id=gg.cui) hit
             FROM gg LEFT JOIN idx i ON i.k=gg.k GROUP BY 1,2)
           SELECT CASE WHEN n=0 THEN 'none' WHEN n=1 AND hit THEN 'correct' WHEN n=1 THEN 'WRONG' ELSE 'ambig' END, count(*) FROM m GROUP BY 1""").fetchall())
        u = d.get("correct", 0) + d.get("WRONG", 0)
        out.append((r, *[round(100 * d.get(k, 0) / N, 2) for k in ["correct", "WRONG", "ambig", "none"]], d.get("WRONG", 0), round(100 * d.get("WRONG", 0) / max(u, 1), 2)))
    import pandas as pd
    print(pd.DataFrame(out, columns=["rule", "correct", "wrong", "ambig", "none", "wrong_n", "wrong/unique"]).to_string(index=False), "\n")
    P(f"""SELECT round(100.0*avg((cui IN (SELECT cui FROM mf))::int),1) pct_true_cui_in_mf_list,
          round(100.0*avg((name IN (SELECT name FROM mj2))::int),1) pct_name_in_mj,
          round(100.0*avg((name IN (SELECT name FROM mj2 GROUP BY 1 HAVING count(DISTINCT rn)=1))::int),1) pct_name_unique_in_mj FROM g""")

print("## Ground truth 1: SEAP NGO-named suppliers with ANAF-confirmed CUI, not in ONRC, not contracting authorities")
run("SEAP", """SELECT DISTINCT e.name, e.bare, e.cui::BIGINT cui, coalesce(m.jud,'') jud FROM ent e LEFT JOIN isomap m USING (county_iso)
             WHERE e.identity='CUI' AND e.ngo AND e.cui::BIGINT NOT IN (SELECT cui FROM onrc_cui) AND e.cui::BIGINT NOT IN (SELECT cui FROM auth)""")
run("SEAP, homeowner associations excluded", """SELECT DISTINCT e.name, e.bare, e.cui::BIGINT cui, coalesce(m.jud,'') jud FROM ent e LEFT JOIN isomap m USING (county_iso)
             WHERE e.identity='CUI' AND e.ngo AND e.name NOT LIKE '%PROPRIETARI%' AND e.cui::BIGINT NOT IN (SELECT cui FROM onrc_cui) AND e.cui::BIGINT NOT IN (SELECT cui FROM auth)""")
print("## Ground truth 2: POCU NGO-named pairs (CUI in text), not in ONRC, not authorities. County = implementation county, so only no-county rules are fair")
run("POCU", """SELECT DISTINCT name, bare, cui, jud FROM eu WHERE prog='POCU' AND ngo AND cui IS NOT NULL
             AND cui NOT IN (SELECT cui FROM onrc_cui) AND cui NOT IN (SELECT cui FROM auth)""")

print("## SEAP NGO suppliers: value")
P("""SELECT count(*) cuis, round(sum(v.ron)/1e9,2) bn_ron, sum(v.recs) recs FROM ent e JOIN entk k ON k.identity=e.identity AND k.display_name=e.display_name AND k.cui IS NOT DISTINCT FROM e.cui JOIN supval v ON v.key=k.key
     WHERE e.identity='CUI' AND e.ngo AND e.cui::BIGINT NOT IN (SELECT cui FROM onrc_cui) AND e.cui::BIGINT NOT IN (SELECT cui FROM auth)""")
P("""SELECT count(*) name_only_ngo_suppliers, round(sum(v.ron)/1e6,1) m_ron FROM ent e JOIN entk k ON k.identity=e.identity AND k.display_name=e.display_name AND k.cui IS NOT DISTINCT FROM e.cui JOIN supval v ON v.key=k.key WHERE e.identity='NAME_ONLY' AND e.ngo""")

print("## Unattached NGO-shaped names in SMIS 2014-2020 lists (no CUI given), distinct names")
X("""CREATE OR REPLACE TABLE un AS SELECT name, any_value(bare) bare, list(DISTINCT prog) progs, sum(val) val FROM eu WHERE ngo AND cui IS NULL GROUP BY 1""")
X("CREATE OR REPLACE TABLE seapsp AS SELECT name, count(DISTINCT cui) n, any_value(cui)::BIGINT cui FROM ent WHERE identity='CUI' GROUP BY 1")
X("CREATE OR REPLACE TABLE mfn AS SELECT name, count(DISTINCT cui) n, any_value(cui) cui FROM mf GROUP BY 1")
X("CREATE OR REPLACE TABLE mjn AS SELECT name, count(DISTINCT rn) n FROM mj2 GROUP BY 1")
X("CREATE OR REPLACE TABLE onrcn AS SELECT 1")
P("""SELECT count(*) names, round(sum(val)/1e9,2) bn_ron_eligible,
      sum((s.n=1)::int) seap_unique, sum((s.n>1)::int) seap_ambig,
      sum((f.n=1)::int) mf_unique, sum((f.n>1)::int) mf_ambig,
      sum((j.n=1)::int) mj_unique_no_cui, sum((j.n>1)::int) mj_ambig,
      sum((s.n=1 OR f.n=1)::int) seap_or_mf_unique,
      sum((s.n=1 AND f.n=1 AND s.cui<>f.cui)::int) seap_mf_disagree,
      sum(((s.n IS NULL OR s.n<>1) AND f.n=1)::int) mf_only_adds
    FROM un LEFT JOIN seapsp s USING (name) LEFT JOIN mfn f USING (name) LEFT JOIN mjn j USING (name)""")
P("""SELECT p.prog, count(*) names, sum((s.n=1)::int) seap_unique, sum((f.n=1)::int) mf_unique, sum((j.n=1)::int) mj_unique
     FROM (SELECT name, unnest(progs) prog FROM un) p LEFT JOIN seapsp s USING (name) LEFT JOIN mfn f USING (name) LEFT JOIN mjn j USING (name) GROUP BY 1 ORDER BY 2 DESC""")

print("## MJ register -> MF CUI bridge (name+county unique on both sides), MJ rows not struck off")
P("""WITH a AS (SELECT name, jud, count(DISTINCT rn) nr FROM mj2 WHERE status<>'radiata' AND jud<>'' GROUP BY 1,2),
          b AS (SELECT name, jud, count(DISTINCT cui) nc FROM mf GROUP BY 1,2)
     SELECT count(*) mj_keys, sum((nr=1 AND nc=1)::int) one_to_one, sum((nc>1 OR nr>1)::int) ambiguous, sum((nc IS NULL)::int) no_mf_row,
            round(100.0*avg((nr=1 AND nc=1)::int),1) pct_one_to_one FROM a LEFT JOIN b USING (name, jud)""")
P("""WITH a AS (SELECT name, count(DISTINCT rn) nr FROM mj2 WHERE status<>'radiata' GROUP BY 1),
          b AS (SELECT name, count(DISTINCT cui) nc FROM mf GROUP BY 1)
     SELECT 'exact name, no county' key, count(*) mj_keys, sum((nr=1 AND nc=1)::int) one_to_one, round(100.0*avg((nr=1 AND nc=1)::int),1) pct FROM a LEFT JOIN b USING (name)""")
print("## MF NGO-named, non-homeowner CUIs with no MJ name match (name+county)")
P("""SELECT count(*) mf_cuis, sum((k IN (SELECT name||'|'||jud FROM mj2))::int) in_mj_by_name_county,
      sum((name IN (SELECT name FROM mj2))::int) in_mj_by_name FROM (SELECT *, name||'|'||jud k FROM mfx)""")

print("## PNRR ONG beneficiaries")
P("""SELECT count(DISTINCT cui) ong_cuis, count(DISTINCT cui) FILTER (WHERE cui IN (SELECT cui FROM onrc_cui)) in_onrc,
      count(DISTINCT cui) FILTER (WHERE cui IN (SELECT cui FROM mf)) in_mf_ngo_list, count(DISTINCT cui) FILTER (WHERE name IN (SELECT name FROM mj2)) name_in_mj,
      count(*) FILTER (WHERE cui IS NULL) no_cui, round(sum(val)/1e9,2) bn_ron FROM pnrr WHERE tip='ONG'""")
