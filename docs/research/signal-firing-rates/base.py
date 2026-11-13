import duckdb
con = duckdb.connect('/tmp/sig127/base.duckdb')
con.execute("""create or replace table w as select * from read_csv('/tmp/sig127/data/winners.csv.gz', header=true,
  types={'code':'VARCHAR','authority_cui':'VARCHAR','authority_key':'VARCHAR','winner_key':'VARCHAR','cpv_code':'VARCHAR','counted_bani':'BIGINT','award_date':'DATE'})""")
# one row per record for value sums
con.execute("create or replace table rec as select code, any_value(kind) kind, any_value(authority_key) authority_key, any_value(authority_cui) authority_cui, any_value(award_date) award_date, any_value(counted_bani) counted_bani, any_value(contract_type) contract_type, any_value(cpv_code) cpv_code from w group by code")
# supplier-level winner rows with CUI
con.execute("create or replace view sw as select * from w where winner_identity='CUI'")
con.execute("create or replace table entity as select * from read_csv('/tmp/sig127/data/entity.csv', header=true, all_varchar=true)")
con.execute("create or replace table anaf as select * from read_csv('/tmp/sig127/data/anaf.csv', header=true, all_varchar=true)")
print(con.sql("select count(*), round(sum(counted_bani)/1e11,2) bn from rec").fetchall())
print(con.sql("select count(distinct winner_key) from sw").fetchall())
print(con.sql("select contract_type, count(*) from rec group by 1 order by 2 desc limit 8").fetchall())
