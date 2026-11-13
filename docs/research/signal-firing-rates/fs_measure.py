import duckdb
con = duckdb.connect('/tmp/sig127-fs/fs.duckdb')
con.execute("ATTACH '/tmp/sig127/base.duckdb' AS b (READ_ONLY)")
parts=[]
for y in range(2020,2026):
    for k in ('uu','bl'):
        parts.append(f"select {y} fy, '{k}' f, * from read_csv('/tmp/sig127-fs/dl/{k}{y}.txt', header=true, all_varchar=true, ignore_errors=true)")
con.execute("create or replace table raw as " + " union all by name ".join(parts))
con.execute("""create or replace table fs as
 select fy, trim(cui) cui, any_value(try_cast(i10 as double)) eq, any_value(try_cast(i13 as double)) turnover,
  any_value(try_cast(i19 as double)) loss, any_value(try_cast(nullif(trim(i20),'') as double)) emp
 from raw where regexp_full_match(trim(cui),'[0-9]+') group by all""")
print(con.sql("select fy, count(*), count(emp) from fs group by 1 order by 1").fetchall())
# supplier-year awards, value split by winners
con.execute("""create or replace table sy as select winner_key cui, year(award_date) y, sum(counted_bani/n_winners)/100.0 ron, count(distinct code) nrec
 from b.sw group by all""")
con.execute("create or replace table ent as select key, display_name from b.entity")
con.execute("""create or replace table co as select key cui from ent where regexp_matches(upper(display_name), '\\b(S\\.?\\s?R\\.?\\s?L|S\\.?\\s?A|SRL-D|S\\.?C\\.?\\s?S)\\b\\.?\\s*$|\\bS\\.?R\\.?L\\b|\\bS\\.?A\\.?$')""")
TOT = con.execute("select sum(counted_bani) from b.rec").fetchone()[0]
def report(label, hits_sql):
    # hits_sql returns (cui, y) pairs; matched records = supplier's records in year y
    con.execute(f"create or replace temp table h as {hits_sql}")
    r = con.execute("""select count(distinct w.code), count(distinct w.winner_key), count(distinct w.authority_key),
       (select sum(counted_bani) from b.rec where code in (select w2.code from b.sw w2 join h on h.cui=w2.winner_key and h.y=year(w2.award_date)))
       from b.sw w join h on h.cui=w.winner_key and h.y=year(w.award_date)""").fetchone()
    v = r[3] or 0
    out = (label, r[0], r[1], r[2], round(v/1e11,2), round(100*v/TOT,2))
    print(out, flush=True); return out
rows=[]
# coverage
cov = con.execute("""select count(distinct winner_key), count(distinct winner_key) filter (where winner_key in (select cui from fs)),
 count(distinct winner_key) filter (where winner_key in (select cui from co)),
 count(distinct winner_key) filter (where winner_key in (select cui from co) and winner_key in (select cui from fs)) from b.sw""").fetchone()
covv = con.execute("select sum(counted_bani) from b.rec where code in (select code from b.sw where winner_key in (select cui from fs))").fetchone()[0]
print('coverage', cov, round(100*covv/TOT,2))
rows.append(report('Base: supplier found in any FY2020-25 statement', "select cui, y from sy where cui in (select cui from fs)"))
for thr in (1e6, 5e6):
    t=int(thr/1e6)
    rows.append(report(f'1a awards in Y >= {t}M, FY Y-1 employees <= 1', f"select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>={thr} and fs.emp<=1"))
    rows.append(report(f'1b awards in Y >= {t}M, FY Y employees <= 1', f"select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y where s.ron>={thr} and fs.emp<=1"))
    rows.append(report(f'1c awards in Y >= {t}M, FY Y-1 employees empty', f"select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>={thr} and fs.emp is null"))
    rows.append(report(f'1d awards in Y >= {t}M, FY Y-1 turnover < 10% of them', f"select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>={thr} and coalesce(fs.turnover,0) < 0.1*s.ron"))
for pct in (100, 50):
    rows.append(report(f'2 awards in Y >= 100k and > {pct}% of FY Y turnover', f"select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y where s.ron>=1e5 and s.ron > {pct/100}*coalesce(fs.turnover,0) and s.y<=2025"))
rows.append(report('3 wins in Y (2022-25), no FY Y-1 or Y row, any CUI', "select s.cui,s.y from sy s where s.y between 2022 and 2025 and not exists (select 1 from fs where fs.cui=s.cui and fs.fy in (s.y-1,s.y))"))
rows.append(report('3 same, SRL/SA names only', "select s.cui,s.y from sy s where s.y between 2022 and 2025 and s.cui in (select cui from co) and not exists (select 1 from fs where fs.cui=s.cui and fs.fy in (s.y-1,s.y))"))
rows.append(report('3 same, SRL/SA, awards in Y >= 1M', "select s.cui,s.y from sy s where s.y between 2022 and 2025 and s.ron>=1e6 and s.cui in (select cui from co) and not exists (select 1 from fs where fs.cui=s.cui and fs.fy in (s.y-1,s.y))"))
rows.append(report('4a awards in Y >= 1M, FY Y-1 equity < 0', "select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>=1e6 and fs.eq<0"))
rows.append(report('4b awards in Y >= 1M, FY Y-1 net loss', "select s.cui,s.y from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>=1e6 and fs.loss>0"))
import json; json.dump({'rows':rows,'cov':list(cov),'covv':covv,'tot':TOT}, open('/tmp/sig127-fs/result.json','w'), default=str)
