import duckdb, json, pathlib, sys
con = duckdb.connect('/tmp/sig127/onrc/onrc.duckdb')
con.execute("attach '/tmp/sig127/base.duckdb' as b (read_only)")
NAT = con.execute("select sum(counted_bani) from b.rec").fetchone()[0]
rd = "read_csv('{}', delim='^', header=true, quote='', escape='', all_varchar=true, ignore_errors=true, encoding='utf-8')"
con.execute(f"create or replace table firme as select CUI cui, COD_INMATRICULARE reg, try_strptime(DATA_INMATRICULARE,'%d/%m/%Y')::date reg_date, FORMA_JURIDICA forma from {rd.format('/tmp/onrc-full/od_firme.csv')} where CUI is not null and CUI<>'0'")
con.execute(f"create or replace table stare as select COD_INMATRICULARE reg, COD cod from {rd.format('/tmp/onrc-full/od_stare_firma.csv')}")
con.execute(f"create or replace table caen as select COD_INMATRICULARE reg, left(COD_CAEN_AUTORIZAT,2) div from {rd.format('/tmp/onrc-full/od_caen_autorizat.csv')}")
# ANAF main CAEN from archive
rows = []
for batch in pathlib.Path.home().joinpath('grivei-data/raw/anaf/vat/v9').iterdir():
    ds = sorted(d for d in batch.iterdir() if (d / 'response.json').exists())
    if not ds: continue
    try: data = json.load(open(ds[-1] / 'response.json'))
    except Exception: continue
    for r in data.get('found', []):
        g = r.get('date_generale', {})
        rows.append((str(g.get('cui')), (g.get('cod_CAEN') or '')[:2], g.get('stare_inregistrare') or ''))
con.execute("create or replace table anafc(cui varchar, caen_div varchar, stare varchar)")
con.executemany("insert into anafc values (?,?,?)", rows)
print('onrc firme', con.execute("select count(*), count(distinct cui) from firme").fetchone(), 'anaf answers', len(rows))
con.execute("create or replace table sup as select distinct winner_key cui from b.sw")
# per CUI: earliest registration date; regs (all) for state/caen
con.execute("create or replace table onrc as select cui, min(reg_date) reg_date, list(distinct reg) regs from firme group by cui")
print('suppliers', con.execute("select count(*) from sup").fetchone(), 'found in ONRC', con.execute("select count(*) from sup join onrc using(cui)").fetchone())

out = []
def measure(name, recs_sql, note=''):
    # recs_sql: select code, supplier cui
    con.execute(f"create or replace temp table m as {recs_sql}")
    r = con.execute("""select count(distinct m.code), count(distinct m.cui), count(distinct rec.authority_key),
                   coalesce(sum(rec.counted_bani) filter (where rn=1),0) from
                   (select *, row_number() over (partition by code) rn from m) m join b.rec rec using(code)""").fetchone()
    out.append((name, r[0], r[1], r[2], r[3]/1e11, 100*r[3]/NAT, note)); print(out[-1], flush=True)

# O1 founded shortly before first SEAP record
con.execute("create or replace table first as select winner_key cui, min(award_date) d from b.sw group by 1")
base = con.execute("select count(*) from first join onrc using(cui) where reg_date>=date '2021-01-01'").fetchone()[0]
for days in (30, 90):
    n = con.execute(f"select count(*) from first join onrc using(cui) where reg_date>=date '2021-01-01' and d-reg_date between 0 and {days}").fetchone()[0]
    print(f'O1 base: {n}/{base} suppliers registered 2021+ win within {days} days')
    measure(f'O1 any record within {days} days of registration (suppliers registered 2021+)',
        f"select code, winner_key cui from b.sw join onrc on onrc.cui=winner_key where reg_date>=date '2021-01-01' and award_date-reg_date between 0 and {days}")
measure('O1b contract/award notice (not direct purchase) within 90 days of registration',
    "select code, winner_key cui from b.sw join onrc on onrc.cui=winner_key where reg_date>=date '2021-01-01' and award_date-reg_date between 0 and 90 and kind in ('CONTRACT','AWARD_NOTICE')")
measure('O1c record >= 1M RON within 180 days of registration',
    "select code, winner_key cui from b.sw join onrc on onrc.cui=winner_key where reg_date>=date '2021-01-01' and award_date-reg_date between 0 and 180 and counted_bani>=100000000")
# O2a after ANAF strike-off date
measure('O2a record awarded after the ANAF strike-off date',
    "select code, winner_key cui from b.sw join b.anaf a on a.cui=winner_key where a.registration like 'RADIERE din data%' and award_date > strptime(substr(a.registration,18,10),'%d.%m.%Y')::date")
measure('O2a\' same, more than 90 days after strike-off',
    "select code, winner_key cui from b.sw join b.anaf a on a.cui=winner_key where a.registration like 'RADIERE din data%' and award_date > strptime(substr(a.registration,18,10),'%d.%m.%Y')::date + 90")
# O2b / BPI: current state (undated)
con.execute("create or replace table cstate as select o.cui, list(distinct s.cod) cods from onrc o, unnest(o.regs) t(reg) join stare s on s.reg=t.reg group by o.cui")
grp = {'faliment': "['1070']", 'insolvency or judicial reorganisation': "['1107','1057','1139']", 'dissolution or liquidation': "['1049','1052','1113','1109','1120']"}
for g, codes in grp.items():
    measure(f'O2b supplier now in {g}: records in the last 6 months (to 2026-10-06)',
        f"select code, winner_key cui from b.sw join cstate c on c.cui=winner_key where list_has_any(c.cods, {codes}) and award_date >= date '2026-04-06'")
    measure(f'O2b supplier now in {g}: all records since 2021 (upper bound)',
        f"select code, winner_key cui from b.sw join cstate c on c.cui=winner_key where list_has_any(c.cods, {codes})")
# O3 works without construction CAEN
con.execute("create or replace table hascon as select o.cui from onrc o, unnest(o.regs) t(reg) join caen c on c.reg=t.reg where c.div in ('41','42','43') group by o.cui")
wbase = con.execute("select count(distinct code), sum(counted_bani) from b.rec where cpv_code like '45%'").fetchone()
print('works records', wbase[0], 'value bn', wbase[1]/1e11)
measure('O3 works (CPV 45) won by firm with no construction CAEN (ONRC authorised, ANAF main)',
    "select code, winner_key cui from b.sw join onrc o on o.cui=winner_key left join hascon h on h.cui=winner_key left join anafc a on a.cui=winner_key where cpv_code like '45%' and h.cui is null and coalesce(a.caen_div,'') not in ('41','42','43')")
measure('O3b same, records >= 1M RON',
    "select code, winner_key cui from b.sw join onrc o on o.cui=winner_key left join hascon h on h.cui=winner_key left join anafc a on a.cui=winner_key where cpv_code like '45%' and h.cui is null and coalesce(a.caen_div,'') not in ('41','42','43') and counted_bani>=100000000")
json.dump(out, open('/tmp/sig127/onrc/results.json','w'), ensure_ascii=False)
