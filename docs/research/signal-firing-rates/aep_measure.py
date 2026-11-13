"""Throwaway (#127): size AEP firm-donor and party-of-leader rules on the SEAP graph export."""
import json, re, sys, unicodedata, importlib.util, duckdb
sys.argv = ['x']  # classify.py reads argv at import only inside main code; load RULES by exec of the top part
src = open('/tmp/party-scripts/classify.py').read().split('import os')[0]
ns = {}; exec(src, ns); classify = ns['classify']

def fold(s): return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().upper()
def parties(label):
    s = fold(label)
    if not s.strip() or 'INDEPENDENT' in s: return set()
    out = set()
    pats = [('SOCIAL DEMOCRAT', 'PSD'), (r'\bPSD\b', 'PSD'), ('NATIONAL LIBERAL', 'PNL'), (r'\bPNL\b', 'PNL'),
            ('UNIUNEA DEMOCRATA MAGHIARA', 'UDMR'), (r'\bUDMR\b', 'UDMR'), ('UNIUNEA SALVATI ROMANIA', 'USR'), (r'\bUSR\b', 'USR'),
            (r'\bPLUS\b|LIBERTATE, UNITATE', 'PLUS'), ('PRO ROMANIA', 'PPRO'), ('MISCAREA POPULARA', 'PMP'), (r'\bPMP\b', 'PMP'),
            ('ALIANTA LIBERALILOR SI DEMOCRATILOR|\bALDE\b', 'ALDE'), ('UNIREA ROMANILOR', 'AUR'), ('FORTA DREPTEI', 'FD'),
            ('ECOLOGIST', 'PER'), ('PUTERII UMANISTE|UMANIST SOCIAL LIBERAL|\bPUSL\b', 'PUSL'), ('CIVIC MAGHIAR', 'PCM'),
            ('FORUMUL DEMOCRAT AL GERMANILOR', 'FDGR'), ('POPULAR MAGHIAR', 'PPMT'), ('ALIANTA SOCIAL LIBERALA', 'USL'),
            ('REINNOIM', 'REPER'), ('PATRIOTII POPORULUI', 'PPR')]
    for p, v in pats:
        if re.search(p, s): out.add(v)
    return out or {'OTHER'}

con = duckdb.connect('/tmp/sig127-aep/aep.duckdb')
con.execute("attach '/tmp/sig127/base.duckdb' as b (read_only)")
bp = json.load(open('/tmp/aep-work/bp.json'))
def cui(c):
    c = (c or '').upper().replace('RO', '').strip()
    return str(int(c)) if c.isdigit() and int(c) > 0 else None
don = [(cui(r['cui']), int(r['an']), r['partid'], r['tip']) for r in bp['donors'] if cui(r['cui']) and r['an']]
con.execute("create or replace table don(cui varchar, yr int, party varchar, tip varchar)")
con.executemany("insert into don values (?,?,?,?)", don)
sub = [(cui(r['cui']), int(r['an']), r['partid']) for r in bp['subsidy_suppliers'] if cui(r['cui']) and r['an']]
con.execute("create or replace table sub(cui varchar, yr int, party varchar)")
con.executemany("insert into sub values (?,?,?)", sub)
print('donor rows with valid CUI', len(don), 'subsidy rows', len(sub), 'of', len(bp['subsidy_suppliers']))

# mandates
mand = []
for y in (2020, 2024):
    for l in open(f'/tmp/party-out/winners_{y}.tsv'):
        yr, off, cc, sir, party, *_ = l.rstrip('\n').split('\t')
        if off == 'PG': continue
        for p in parties(party): mand.append((y, off, cc.upper(), sir, p, party))
con.execute("create or replace table mand(y int, off varchar, county varchar, siruta varchar, party varchar, label varchar)")
con.executemany("insert into mand values (?,?,?,?,?,?)", mand)

# authorities: classify by name, placement from entity
auth = con.sql("select distinct r.authority_key, e.display_name, e.county_iso, e.uat_siruta from b.rec r join b.entity e on e.key=r.authority_key").fetchall()
rows = [(k, classify(n)[:2], c, s) for k, n, c, s in auth]
con.execute("create or replace table auth(key varchar, cls varchar, county varchar, siruta varchar)")
con.executemany("insert into auth values (?,?,?,?)", rows)
print(con.sql("select cls, count(*), count(siruta), count(county) from auth where cls in ('A1','A3') group by 1").fetchall())

# record -> mandate year by fixed cutover 2024-10-25
con.execute("""create or replace table lead as
 select r.code, r.authority_key, r.award_date, r.counted_bani, case when r.award_date < date '2024-10-25' then 2020 else 2024 end my, a.cls, a.county, a.siruta
 from b.rec r join auth a on a.key=r.authority_key where a.cls in ('A1','A3')""")
con.execute("""create or replace table lead_party as
 select distinct l.code, m.party from lead l join mand m on m.y=l.my and (
   (l.cls='A3' and m.off='P' and m.siruta=l.siruta) or (l.cls='A1' and m.off='PCJ' and m.county=l.county))""")
T = con.sql("select sum(counted_bani) from b.rec").fetchall()[0][0]
def line(name, q):
    r = con.sql(f"""with m as ({q}) select count(distinct code), count(distinct sup), count(distinct authority_key),
       (select coalesce(sum(counted_bani),0) from b.rec where code in (select code from m)) from m""").fetchall()[0]
    print(f"| {name} | {r[0]:,} | {r[1]:,} | {r[2]:,} | {r[3]/1e11:.2f} | {r[3]/T:.2%} |")
print('lead records', con.sql("select count(*), sum(counted_bani)/1e11, count(*) filter (where code in (select code from lead_party)), (select sum(counted_bani) from lead where code in (select code from lead_party))/1e11 from lead").fetchall())
print('national bn', T/1e11)
print("| Rule | Records | Suppliers | Authorities | Value bn RON | Share |")
print("|---|---|---|---|---|---|")
base = "select s.code, s.winner_key sup, r.authority_key, r.award_date from b.sw s join b.rec r using(code)"
line('All authorities led by an attributed leader (denominator)', "select l.code, null sup, l.authority_key from lead l where l.code in (select code from lead_party)")
line('1. Firm donor/lender is a SEAP supplier, award in or after a donation year (all years)', f"select x.* from ({base}) x where exists (select 1 from don d where d.cui=x.sup and d.yr <= year(x.award_date))")
line('1b. same, donations since 2020', f"select x.* from ({base}) x where exists (select 1 from don d where d.cui=x.sup and d.yr>=2020 and d.yr <= year(x.award_date))")
line('2a. Donor to the controlling party, donation year < award year', f"select x.* from ({base}) x join lead_party lp on lp.code=x.code where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and d.yr < year(x.award_date))")
line('2a\'. same, donation year <= award year', f"select x.* from ({base}) x join lead_party lp on lp.code=x.code where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and d.yr <= year(x.award_date))")
line('2b. Donor to the controlling party, donation year within ±1 of award year', f"select x.* from ({base}) x join lead_party lp on lp.code=x.code where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and abs(d.yr - year(x.award_date))<=1)")
line('2c. Donor (any year) wins from an attributed-leader authority, any party', f"select x.* from ({base}) x join lead_party lp on lp.code=x.code where exists (select 1 from don d where d.cui=x.sup and d.yr <= year(x.award_date))")
line('3. Subsidy-paid supplier is a SEAP supplier (any award 2021+)', f"select x.* from ({base}) x where exists (select 1 from sub d where d.cui=x.sup)")
# base comparison
print(con.sql(f"""with s as (select x.sup, sum(r.counted_bani) v from (select distinct winner_key sup, code from b.sw) x join b.rec r using(code) group by 1)
 select (select count(*) from s), median(v)/100, avg(v)/100,
   count(*) filter (where sup in (select cui from don)), median(v) filter (where sup in (select cui from don))/100, avg(v) filter (where sup in (select cui from don))/100,
   count(*) filter (where sup in (select cui from don where yr>=2020)), median(v) filter (where sup in (select cui from don where yr>=2020))/100
 from s""").fetchall())
print(con.sql("""select lp.party, count(distinct x.sup) from (select s.code, s.winner_key sup, r.award_date from b.sw s join b.rec r using(code)) x join lead_party lp on lp.code=x.code
  where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and abs(d.yr - year(x.award_date))<=1) group by 1 order by 2 desc""").fetchall())
print(con.sql("""select lp.party, count(distinct x.sup) from (select s.code, s.winner_key sup, r.award_date from b.sw s join b.rec r using(code)) x join lead_party lp on lp.code=x.code
  where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and d.yr < year(x.award_date)) group by 1 order by 2 desc""").fetchall())
line('2d. Donor to the controlling party, donation in the award year or the 4 years before', f"select x.* from ({base}) x join lead_party lp on lp.code=x.code where exists (select 1 from don d where d.cui=x.sup and d.party=lp.party and d.yr between year(x.award_date)-4 and year(x.award_date))")
print(con.sql("select count(distinct cui) from don").fetchall(), con.sql("select count(distinct cui) from don where yr>=2020").fetchall(), con.sql("select count(distinct cui) from sub").fetchall())
print(con.sql("select count(distinct code) filter (where cls='A1'), count(distinct code) filter (where cls='A3') from lead where code in (select code from lead_party)").fetchall())
