# PROTOTYPE (ticket #123), throwaway. Loads ONRC + SEAP extracts into a scratch DuckDB.
import duckdb, sys
dl, onrc, seap, db = sys.argv[1:5]
c = duckdb.connect(db)
c.execute("SET preserve_insertion_order=false")
rd = lambda f: f"read_csv('{f}', delim='^', header=true, all_varchar=true, quote='', escape='')"
c.execute(f"""CREATE OR REPLACE TABLE firme AS
 SELECT COD_INMATRICULARE reg, nullif(trim(CUI),'0') cui, DENUMIRE den, FORMA_JURIDICA forma, ADR_JUDET jud
 FROM {rd(onrc+'/od_firme.csv')}""")
c.execute("""CREATE OR REPLACE MACRO norm(s) AS
  trim(regexp_replace(regexp_replace(strip_accents(upper(coalesce(s,''))),'[^A-Z ]',' ','g'),' +',' ','g'))""")
c.execute(f"""CREATE OR REPLACE TABLE reps AS
 SELECT COD_INMATRICULARE reg, PERSOANA_IMPUTERNICITA raw_name, CALITATE rol,
   norm(PERSOANA_IMPUTERNICITA) name,
   nullif(substr(trim(DATA_NASTERE),1,10),'') dob,
   nullif(norm(split_part(LOCALITATE_NASTERE,',',1)),'') bloc,
   nullif(norm(coalesce(nullif(JUDET_NASTERE,''), split_part(LOCALITATE_NASTERE,',',2))),'') bjud,
   nullif(norm(TARA_NASTERE),'') btara, 'L' src
 FROM {rd(dl+'/od_reprezentanti_legali.csv')}
 UNION ALL
 SELECT COD_INMATRICULARE, NUME, CALITATE, norm(NUME), nullif(substr(trim(DATA_NASTERE),1,10),''),
   nullif(norm(split_part(LOCALITATE_NASTERE,',',1)),''),
   nullif(norm(coalesce(nullif(JUDET_NASTERE,''), split_part(LOCALITATE_NASTERE,',',2))),''),
   nullif(norm(TARA_NASTERE),''), 'IF'
 FROM {rd(dl+'/od_reprezentanti_if.csv')}""")
# SEAP supplier CUIs 2021-2026; drop 13-digit CNP-shaped keys without storing them
c.execute(f"""CREATE OR REPLACE TABLE seap AS
 SELECT regexp_replace(upper(column1),'^RO|[^0-9]','','g') cui, sum(try_cast(column4 AS DOUBLE)) val, count(*) n
 FROM read_csv('{seap}/*.tsv', delim='\t', header=false, quote='', escape='', auto_detect=false, ignore_errors=true,
   columns={{'column0':'VARCHAR','column1':'VARCHAR','column2':'VARCHAR','column3':'VARCHAR','column4':'VARCHAR'}})
 WHERE NOT regexp_matches(regexp_replace(column1,'[^0-9]','','g'), '^[1-8][0-9]{{12}}$')
 GROUP BY 1""")
for t in ["firme","reps","seap"]:
    print(t, c.execute(f"select count(*) from {t}").fetchone())
