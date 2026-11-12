"""PROTOTYPE (#136), throwaway. False-link rates of name -> CUI rules, using SEAP suppliers with an ANAF-confirmed CUI as ground truth.
The test name is the supplier name as SEAP spelled it (not ANAF's name); the county is ANAF's seat county of the true CUI.
Also measures contracting-authority name ambiguity (task 4).
argv: work_dir seap_tsv_dir   (work_dir holds onrc.tsv, anaf.tsv from prep.py and orgmatch.duckdb from onrc_homonymy.py)"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duckdb, pandas as pd
from norm import norm, strip_form, county, locality

w, seap = sys.argv[1:3]
c = duckdb.connect(f"{w}/orgmatch.duckdb")
X = c.execute
X("SET preserve_insertion_order=false")
X(f"""CREATE OR REPLACE TABLE anaf AS SELECT * FROM read_csv('{w}/anaf.tsv', delim='\t', header=false, quote='', escape='',
  columns={{'cui':'VARCHAR','aname':'VARCHAR','jud':'VARCHAR','iso':'VARCHAR','loc':'VARCHAR','rad':'INT'}})""")
# SEAP winners; CNP-shaped ids are dropped here and never kept
X(f"""CREATE OR REPLACE TABLE seap_raw AS
 SELECT kind, try_cast(dd AS DATE) dd, raw, regexp_replace(upper(cuiraw),'^\\s*RO|[^0-9]','','g') cui0, try_cast(val AS DOUBLE) val,
        araw, regexp_replace(upper(acuiraw),'^\\s*RO|[^0-9]','','g') acui0
 FROM read_csv('{seap}/*.tsv', delim='\t', header=false, quote='', escape='', auto_detect=false, ignore_errors=true,
   columns={{'kind':'VARCHAR','dd':'VARCHAR','raw':'VARCHAR','cuiraw':'VARCHAR','val':'VARCHAR','araw':'VARCHAR','acuiraw':'VARCHAR'}})""")
X("""CREATE OR REPLACE TABLE seap AS SELECT kind, dd, raw, CASE WHEN regexp_matches(cui0,'^[1-8][0-9]{12}$') OR cui0='' OR length(cui0)>10 THEN NULL
       ELSE CAST(CAST(cui0 AS HUGEINT) AS VARCHAR) END cui,
       -- rough stand-in for the Suspect value rule (GLOSSARY): DA/DAN over ~10x the cap, or any share over 10 bn RON, counts as 0
       CASE WHEN (kind IN ('DA','DAN') AND val > 3e6) OR val > 1e10 THEN 0 ELSE coalesce(val,0) END val, coalesce(val,0) val_raw, araw,
       CASE WHEN acui0='' OR length(acui0)>10 THEN NULL ELSE CAST(CAST(acui0 AS HUGEINT) AS VARCHAR) END acui FROM seap_raw""")
X("DROP TABLE seap_raw")
print(X("SELECT count(*), count(cui), count(DISTINCT cui), sum(val_raw)/1e9, sum(val)/1e9 FROM seap").fetchone(), "winner rows / with non-CNP CUI / distinct / bn RON raw / bn RON after rough suspect filter")

# normalise distinct spellings in Python
names = [r[0] for r in X("SELECT DISTINCT raw FROM seap WHERE raw IS NOT NULL AND cui IS NOT NULL").fetchall()]
nm = pd.DataFrame({"raw": names, "name": [norm(s) for s in names]})
nm["bare"] = nm["name"].map(strip_form)
X("CREATE OR REPLACE TABLE nm AS SELECT * FROM nm")

# ground truth: (normalised SEAP spelling, ANAF-confirmed CUI)
X("""CREATE OR REPLACE TABLE gt AS
 SELECT n.name, any_value(n.bare) bare, s.cui, sum(s.val) val, coalesce(sum(s.val) FILTER (WHERE s.dd >= DATE '2025-01-01'),0) val25, count(*) rows, min(s.dd) first_day, max(s.dd) last_day,
        any_value(a.jud) jud, any_value(a.aname) aname, s.cui IN (SELECT cui FROM onrc WHERE cui<>'') in_onrc,
        any_value(o.person_form) person_form
 FROM seap s JOIN nm n USING (raw) JOIN anaf a USING (cui)
 LEFT JOIN (SELECT cui, bool_or(person_form) person_form FROM o GROUP BY 1) o USING (cui)
 WHERE n.name<>'' GROUP BY n.name, s.cui""")
print(X("SELECT count(*), count(DISTINCT cui), sum(in_onrc::int), count(DISTINCT cui) FILTER (WHERE in_onrc), sum(val)/1e9 FROM gt").fetchone(),
      "test pairs (spelling, CUI) / CUIs / pairs whose CUI is in ONRC / such CUIs / bn RON")

# alias index from SEAP spellings attached to confirmed CUIs before 2025 (r5 is tested on pairs that occur in 2025+ rows, weighted by 2025+ value)
X("""CREATE OR REPLACE TABLE alias AS SELECT DISTINCT n.name, n.bare, s.cui, a.jud FROM seap s JOIN nm n USING (raw) JOIN anaf a USING (cui)
     WHERE s.dd < DATE '2025-01-01' AND n.name<>''""")

RULES = {
    "r1 name+form, all ONRC": ("SELECT name k, cui FROM o", "name"),
    "r2 name+form, not struck off": ("SELECT name k, cui FROM o WHERE struck=0", "name"),
    "r3 name+form + county": ("SELECT name||'|'||jud k, cui FROM o", "name||'|'||jud"),
    "r3b name+form + county, not struck off": ("SELECT name||'|'||jud k, cui FROM o WHERE struck=0", "name||'|'||jud"),
    "r4 name without form + county": ("SELECT bare||'|'||jud k, cui FROM o", "bare||'|'||jud"),
    "r4b name without form + county, not struck off": ("SELECT bare||'|'||jud k, cui FROM o WHERE struck=0", "bare||'|'||jud"),
    "r1x name without form, all ONRC": ("SELECT bare k, cui FROM o", "bare"),
    "r5 r1 + SEAP alias index (<2025)": ("SELECT name k, cui FROM o UNION SELECT name, cui FROM alias", "name"),
    "r5c r5 + county": ("SELECT name||'|'||jud k, cui FROM o UNION SELECT name||'|'||jud, cui FROM alias", "name||'|'||jud"),
    "r5d r4 + SEAP alias index (name without form + county)": ("SELECT bare||'|'||jud k, cui FROM o UNION SELECT bare||'|'||jud, cui FROM alias", "bare||'|'||jud"),
}


VAL = 'val'


def classify(rule, src, key, where="true"):
    X(f"CREATE OR REPLACE TEMP TABLE idx AS SELECT DISTINCT k, cui FROM ({src}) WHERE k IS NOT NULL")
    X(f"""CREATE OR REPLACE TEMP TABLE res AS
      WITH g AS (SELECT *, {key} k FROM gt WHERE {where}),
           m AS (SELECT g.name, g.cui, count(i.cui) n, bool_or(i.cui=g.cui) hit FROM g LEFT JOIN idx i ON i.k=g.k GROUP BY 1,2)
      SELECT g.*, m.n, m.hit, CASE WHEN m.n=0 THEN 'no match' WHEN m.n=1 AND m.hit THEN 'unique correct'
                                    WHEN m.n=1 THEN 'unique WRONG' ELSE 'ambiguous' END cls
      FROM g JOIN m USING (name, cui)""")
    return X(f"""SELECT cls, count(*) n, sum({VAL}) v FROM res GROUP BY 1""").fetchall()


def table(subset_label, where, val='val'):
    global VAL
    VAL = val
    out = []
    for rule, (src, key) in RULES.items():
        r = {cls: (n, v) for cls, n, v in classify(rule, src, key, where)}
        N = sum(n for n, v in r.values()); V = sum(v for n, v in r.values()) or 1
        row = {"rule": rule}
        for cls in ["unique correct", "unique WRONG", "ambiguous", "no match"]:
            n, v = r.get(cls, (0, 0))
            row[cls + " %n"] = round(100 * n / N, 2)
        for cls in ["unique correct", "unique WRONG", "ambiguous"]:
            n, v = r.get(cls, (0, 0))
            row[cls + " %RON"] = round(100 * v / V, 2)
        wr = r.get("unique WRONG", (0, 0))[0]; uc = r.get("unique correct", (0, 0))[0]
        row["WRONG / all unique %"] = round(100 * wr / max(wr + uc, 1), 2)
        out.append(row)
    print(f"\n## {subset_label}  (N pairs = {N}, RON bn = {V/1e9:.1f})")
    print(pd.DataFrame(out).to_string(index=False))


table("all test pairs (SEAP spelling, ANAF-confirmed CUI)", "true")
table("true CUI is in ONRC", "in_onrc")
table("true CUI is in ONRC, excl. PFA/II/IF/PF", "in_onrc AND NOT person_form")
table("hold-out: pairs used in 2025+ rows, true CUI in ONRC, value = 2025+ only; alias index built from pre-2025 rows (r5 is only fair here)",
      "in_onrc AND last_day >= DATE '2025-01-01'", "val25")
table("hold-out, only pairs first seen 2025+ (spelling new to the alias index)", "in_onrc AND first_day >= DATE '2025-01-01'", "val25")

# What are the wrong unique links made of? Compare the SEAP spelling with ANAF's own name for the true CUI.
#  short: ANAF's name starts with the SEAP spelling, or contains all its words (SEAP used a short or brand name that is another firm's full name)
#  near:  Jaro-Winkler >= 0.9 to ANAF's name (typo, word split, other legal form)
#  unlike: neither; mostly a wrong CUI typed into SEAP (the name link may well be right) or a renamed firm
X("CREATE OR REPLACE MACRO sf(s) AS trim(regexp_replace(s, '\\b(SRL|SA|PFA|II|IF|PF|SNC|SCS|SCA|RA)\\b', '', 'g'))")
for rule in ["r1 name+form, all ONRC", "r3 name+form + county", "r4 name without form + county",
             "r4b name without form + county, not struck off", "r5d r4 + SEAP alias index (name without form + county)"]:
    src, key = RULES[rule]
    classify(rule, src, key, "in_onrc")
    print(f"\n## {rule}: unique WRONG links (true CUI in ONRC), by how the SEAP spelling relates to ANAF's name for the true CUI")
    print(X("""WITH r AS (SELECT *, regexp_replace(sf(aname),' +',' ','g') ab FROM res WHERE cls='unique WRONG')
        SELECT CASE WHEN starts_with(ab, bare) OR list_has_all(string_split(ab,' '), string_split(bare,' ')) THEN 'short: SEAP used a shortened name'
                    WHEN jaro_winkler_similarity(bare, ab) >= 0.9 THEN 'near: typo / spacing / other form'
                    ELSE 'unlike: likely wrong CUI in SEAP or renamed firm' END why,
               count(*) n, round(100.0*count(*)/(SELECT count(*) FROM gt WHERE in_onrc),3) pct_of_pairs, round(sum(val)/1e6,1) m_ron
        FROM r GROUP BY 1 ORDER BY 2 DESC""").fetchdf().to_string(index=False))

# ---- task 4: contracting authorities ----
X("""CREATE OR REPLACE TABLE auth AS SELECT DISTINCT araw, acui FROM seap WHERE acui IS NOT NULL AND araw IS NOT NULL""")
an = [r[0] for r in X("SELECT DISTINCT araw FROM auth").fetchall()]
X("CREATE OR REPLACE TABLE anm AS SELECT * FROM (SELECT unnest($1) raw, unnest($2) name)", [an, [norm(s) for s in an]])
X("""CREATE OR REPLACE TABLE au AS SELECT DISTINCT n.name, a.acui cui, f.jud, f.loc FROM auth a JOIN anm n ON n.raw=a.araw
     LEFT JOIN anaf f ON f.cui=a.acui WHERE n.name<>''""")
print("\n## contracting authorities:", X("""SELECT count(DISTINCT cui), count(DISTINCT cui) FILTER (WHERE jud IS NOT NULL AND jud<>''),
       count(DISTINCT name) FROM au""").fetchone(), "distinct CUIs / with ANAF county / distinct normalised names")
rows = []
for scope, where in [("all authority CUIs", "true"), ("only CUIs with ANAF county", "jud IS NOT NULL AND jud<>''")]:
    for kl, key in [("name", "name"), ("name + county", "name, jud"), ("name + county + locality", "name, jud, loc")]:
        if scope == "all authority CUIs" and kl != "name":
            continue
        r = X(f"""WITH k AS (SELECT {key}, count(DISTINCT cui) n FROM au WHERE {where} GROUP BY ALL),
                      f AS (SELECT DISTINCT cui, {key} FROM au WHERE {where})
                  SELECT (SELECT count(*) FROM k), (SELECT avg((n>1)::int) FROM k), (SELECT avg((k.n>1)::int) FROM f JOIN k USING ({key})),
                         (SELECT max(n) FROM k)""").fetchone()
        rows.append((scope, kl, r[0], round(100 * r[1], 2), round(100 * r[2], 2), r[3]))
print(pd.DataFrame(rows, columns=["scope", "key", "distinct keys", "% keys >1 CUI", "% CUIs sharing key", "max CUIs/key"]).to_string(index=False))
print("\n## most frequent authority homonym names (name + county), anonymised to their pattern")
print(X("""SELECT array_to_string(list_slice(string_split(name,' '),1,2),' ') || ' ...' pat, count(*) keys FROM
           (SELECT name, jud FROM au WHERE jud<>'' GROUP BY 1,2 HAVING count(DISTINCT cui)>1) GROUP BY 1 ORDER BY 2 DESC LIMIT 12""").fetchdf().to_string(index=False))
