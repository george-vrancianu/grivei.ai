import duckdb
con = duckdb.connect('/tmp/sig127-fs/fs.duckdb', read_only=True)
con.execute("ATTACH '/tmp/sig127/base.duckdb' AS b (READ_ONLY)")
print(con.execute("""select s.cui, s.y, round(s.ron/1e6,1) awards_m, s.nrec, fs.emp, round(fs.turnover/1e6,2) to_m,
  (select round(turnover/1e6,1) from fs f2 where f2.cui=s.cui and f2.fy=s.y) to_y_m,
  (select emp from fs f2 where f2.cui=s.cui and f2.fy=s.y) emp_y
 from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 where s.ron>=5e6 and fs.emp<=1 order by hash(s.cui) limit 8""").fetchall())
# 1a at 5M: how many also low turnover in Y (still near-empty after the award year)?
print(con.execute("""select count(distinct s.cui), count(distinct s.cui) filter (where f2.emp<=1), count(distinct s.cui) filter (where f2.turnover >= 0.5*s.ron)
 from sy s join fs on fs.cui=s.cui and fs.fy=s.y-1 left join fs f2 on f2.cui=s.cui and f2.fy=s.y where s.ron>=5e6 and fs.emp<=1""").fetchall())
# rule 3 SRL/SA >=1M: kinds of firms (by key words) and did they file ever
print(con.execute("""select (s.cui in (select cui from fs)) ever_filed, count(distinct s.cui)
 from sy s where s.y between 2022 and 2025 and s.ron>=1e6 and s.cui in (select cui from co) and not exists (select 1 from fs where fs.cui=s.cui and fs.fy in (s.y-1,s.y)) group by 1""").fetchall())
print(con.execute("""select regexp_extract(upper(e.display_name),'(ASIGUR|BANK|BANCA|REASIG|LEASING|IFN|SUCURSALA|BRANCH|REGIA|COMPANIA NATIONALA|SPITAL)') k, count(distinct s.cui)
 from sy s join ent e on e.key=s.cui where s.y between 2022 and 2025 and s.ron>=1e6 and s.cui in (select cui from co) and not exists (select 1 from fs where fs.cui=s.cui and fs.fy in (s.y-1,s.y)) group by 1 order by 2 desc""").fetchall())
