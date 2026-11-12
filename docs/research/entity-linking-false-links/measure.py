# PROTOTYPE (ticket #123), throwaway. False-link / ambiguity rates for name-based person matching on ONRC.
import duckdb
c = duckdb.connect('/tmp/elink-scratch-PROTOTYPE.duckdb')
X = lambda q: c.execute(q)
def show(title, q):
    print('##', title); print(c.execute(q).fetchdf().to_string(index=False)); print()

X("""CREATE OR REPLACE MACRO canjud(s) AS nullif(trim(regexp_replace(coalesce(s,''), '^(JUDETUL|JUD|MUNICIPIUL|MUN) ', '')),'')""")
X("""CREATE OR REPLACE MACRO canloc(s) AS CASE WHEN s LIKE '%BUCURESTI%' THEN 'BUCURESTI' ELSE
      nullif(trim(regexp_replace(coalesce(s,''), '^((LOC|LOCALITATEA|MUNICIPIUL|MUN|ORAS|ORASUL|COM|COMUNA|SAT|SATUL|JUD|JUDETUL) )+', '')),'') END""")
X("""CREATE OR REPLACE MACRO sortname(s) AS array_to_string(list_sort(string_split(s,' ')),' ')""")
# natural-person rows: no legal-form token; registration joined to firm + SEAP flag
X("""CREATE OR REPLACE TABLE np AS
 SELECT r.reg, f.cui, r.rol, r.name, sortname(r.name) sname, r.dob, canloc(r.bloc) bloc, canjud(r.bjud) bjud,
        canjud(norm(f.jud)) fjud, s.cui IS NOT NULL named, coalesce(s.val,0) val
 FROM reps r LEFT JOIN firme f USING (reg) LEFT JOIN seap s ON s.cui = f.cui
 WHERE NOT regexp_matches(r.name, '\\b(SRL|IPURL|SPRL|SA|SCA|SNC|SCS|RA|SCPI|CABINET|SOCIETATE|GMBH|LTD|LLC|SPA|SAS|BV|KFT|INSOLV|CONSULTING)\\b')
   AND length(r.name) > 0""")
show("population", """select named, count(*) rows, count(dob) with_dob, count(distinct reg) regs,
   count(distinct (name,dob)) persons_name_dob, count(distinct name) names from np group by 1""")

# truth person = (name, dob); only rows with dob
X("CREATE OR REPLACE TABLE t AS SELECT * FROM np WHERE dob IS NOT NULL")
# Named persons: (name,dob) with at least one role in a SEAP supplier
X("CREATE OR REPLACE TABLE namedp AS SELECT DISTINCT name, dob FROM t WHERE named")
show("named persons", "select count(*) named_persons from namedp")

rules = {
 'R1 exact name':                 "name",
 'R1b name, token order ignored':  "sname",
 'R2 name + birth county':        "name, bjud",
 'R3 name + company seat county':  "name, fjud",
 'R4 name + birth date':          "name, dob",
 'R5 name + birth date + birth locality': "name, dob, bloc",
}
out = []
for label, key in rules.items():
    # for each Named person: number of OTHER truth persons in the same rule cluster
    r = c.execute(f"""
     WITH k AS (SELECT DISTINCT {key}, name AS tn, dob AS td FROM t),
          cl AS (SELECT {key}, count(*) persons FROM k GROUP BY ALL),
          np2 AS (SELECT k.tn, k.td, max(cl.persons) - 1 others  -- worst cluster this person sits in
                  FROM k JOIN cl USING ({key}) JOIN namedp n ON n.name=k.tn AND n.dob=k.td GROUP BY 1,2)
     SELECT count(*) named_persons,
            avg((others>0)::int) share_merged_with_someone,
            median(others) FILTER (WHERE others>0) median_others_if_merged,
            quantile_cont(others, 0.99) p99_others
     FROM np2""").fetchone()
    out.append((label,)+r)
import pandas as pd
print('## rule -> share of Named persons whose cluster absorbs another (name,dob) person')
print(pd.DataFrame(out, columns=['rule','named_persons','share_merged','median_others_if_merged','p99_others']).to_string(index=False)); print()

# Pair-level: among company pairs linked by rule (both companies hold a Named person row), share with different truth
for label, key in [('R1 exact name','name'),('R2 name + birth county','name, bjud'),('R3 name + company seat county','name, fjud')]:
    show(f"pair precision {label} (links from a Named person's role to any other role)", f"""
      WITH g AS (SELECT {key}, name tn, dob td, count(*) n, sum(named::int) nn FROM t GROUP BY ALL),
           cl AS (SELECT {key}, sum(n) n, sum(nn) nn FROM g GROUP BY ALL)
      SELECT sum(cl.nn * (cl.n-1)) links_from_named, 
             1 - (SELECT sum(nn*(n-1)) FROM g) / sum(cl.nn*(cl.n-1)) false_link_share
      FROM cl""")

# R6: name inside one registration: two different (name,dob) in the same company
show("R6 name within one company: same name, different birth dates, same registration", """
  select count(*) regs_with_namesake_pair, sum(named::int) of_which_named
  from (select reg, name, bool_or(named) named from t group by reg, name having count(distinct dob)>1)""")

# Proxy check 1: (name,dob) with conflicting birth localities (both present)
show("proxy check: (name,dob) persons with >1 birth locality", """
  select count(*) filter (where nloc>1) conflicting, count(*) all_with_loc,
         count(*) filter (where nloc>1 and named) conflicting_named
  from (select name, dob, count(distinct bloc) nloc, bool_or(named) named from t where bloc is not null group by 1,2)""")
show("sample of conflicting birth localities", """
  select name, list(distinct bloc) locs, list(distinct bjud) juds from t where bloc is not null
  group by name, dob having count(distinct bloc)>1 using sample 25""")
# Proxy check 2: birthday-problem expectation for same-name different people sharing a dob
show("proxy check: expected same-birthday collisions (birthday model, D = distinct dobs per name-year span ~ 25k)", """
  with m as (select name, count(distinct dob) m from t group by 1)
  select sum(m*(m-1)/2.0)/25000 expected_colliding_pairs, sum(m) persons,
         2*sum(m*(m-1)/2.0)/25000/sum(m) share_of_persons_in_collision,
         max(m) max_persons_one_name
  from m""")
# Split check: same (sorted name, dob) under different token orders
show("split check: (sorted name, dob) persons written in >1 token order", """
  select count(*) filter (where nv>1) split, count(*) total from (select sname, dob, count(distinct name) nv from t group by 1,2)""")
show("split check: Named roles with no birth date (can't be linked by R4)", """
  select count(*) filter (where dob is null) no_dob, count(*) total from np where named""")
