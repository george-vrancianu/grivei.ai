"""Throwaway (#127): size PNRR, state aid and POCU candidate rules against the SEAP graph export."""
import duckdb, gzip, json, glob, re, unicodedata, datetime, openpyxl, csv

DB = '/tmp/sig127-pnrr/work.duckdb'
con = duckdb.connect(DB)
con.execute("attach '/tmp/sig127/base.duckdb' as b (read_only)")
NAT = con.execute("select sum(counted_bani) from b.rec").fetchone()[0]

def ld(ts):  # '2023-01-25T22:00:00Z' is local midnight in UTC
    if not ts: return None
    return (datetime.datetime.fromisoformat(ts.replace('Z', '+00:00')) + datetime.timedelta(hours=3)).date()

def ncui(c):
    s = re.sub(r"\D", "", str(c or "")).lstrip("0")
    return s or None

def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFKD", s or "") if not unicodedata.combining(c)).upper()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", s)).strip()

# ---- ONRC firms (registration date, legal form)
con.execute("""create or replace table onrc as
 select cast(ltrim(trim(CUI),'0') as varchar) cui, min(try_strptime(left(trim(DATA_INMATRICULARE),10),'%d/%m/%Y')::date) reg,
        bool_and(FORMA_JURIDICA in ('PF','II','IF')) individual
 from read_csv('/tmp/onrc-full/od_firme.csv', delim='^', header=true, all_varchar=true, quote='', ignore_errors=true)
 where regexp_full_match(trim(CUI),'[0-9]+') and ltrim(trim(CUI),'0')<>'' and DATA_INMATRICULARE is not null
 group by 1""")
con.execute("create or replace table company as select cui, reg from onrc where not individual")

# ---- SEAP helpers
con.execute("create or replace table sup as select distinct winner_key cui from b.sw")
con.execute("create or replace table auth as select distinct authority_cui cui from b.rec where authority_cui is not null")

out = []
def metric(label, where_sql):
    """where_sql selects (code) rows from b.sw aliased s; returns dict."""
    r = con.execute(f"""with m as (select s.code, s.winner_key, s.authority_key from b.sw s where {where_sql})
      select (select count(distinct code) from m), (select count(distinct winner_key) from m), (select count(distinct authority_key) from m),
             (select coalesce(sum(counted_bani),0) from b.rec where code in (select code from m))""").fetchone()
    out.append((label, r[0], r[1], r[2], r[3] / 1e11, 100 * r[3] / NAT))
    return r

def authmetric(label, set_sql):
    r = con.execute(f"""select count(*), 0, count(distinct authority_key), coalesce(sum(counted_bani),0) from b.rec where authority_cui in ({set_sql})""").fetchone()
    out.append((label, r[0], '–', r[2], r[3] / 1e11, 100 * r[3] / NAT))

def section(t): out.append(('##', t))
def note(t): out.append(('#', t))

# ===================== PNRR
P = json.load(gzip.open('/tmp/sig127-pnrr/dl/20261015-progres_tehnic_proiecte.json.gz'))
Y = json.load(gzip.open('/tmp/sig127-pnrr/dl/20261015-plati_pnrr.json.gz'))
con.execute("create or replace table pnrr_proj(cui varchar, tip varchar, cri varchar, angaj date, val double)")
con.executemany("insert into pnrr_proj values (?,?,?,?,?)",
                [(ncui(r['cui']), (r['tip_beneficiar'] or '').strip(), r['cri'], ld(r['data_angajament']), r['valoare_total'] or 0) for r in P])
con.execute("create or replace table pnrr_pay(cui varchar, cri varchar, cri_name varchar, paid date, val double)")
con.executemany("insert into pnrr_pay values (?,?,?,?,?)",
                [(ncui(r['cui_beneficiar_final']), r['cri'], r['cri_denumire'], ld(r['data_plata']), r['valoare_plata_fe'] or 0) for r in Y])
con.execute("create or replace table pnrr_ben as select distinct cui from pnrr_proj where cui is not null")
con.execute("create or replace table pnrr_rcpt as select distinct cui from (select cui from pnrr_proj union all select cui from pnrr_pay) where cui is not null")
con.execute("create or replace table pnrr_co as select r.cui from pnrr_rcpt r join company c using (cui)")
section('PNRR')
s = con.execute("""select (select count(*) from pnrr_rcpt), (select count(*) from pnrr_co), (select count(*) from pnrr_co where cui in (select cui from sup)),
  (select count(*) from pnrr_ben where cui in (select cui from auth))""").fetchone()
note(f"PNRR recipient CUIs {s[0]}; companies in ONRC {s[1]}, of which SEAP suppliers {s[2]}; PNRR project beneficiaries that are SEAP authorities {s[3]}")
metric('2a. PNRR company recipient wins any SEAP award', "s.winner_key in (select cui from pnrr_co)")
metric('2b. … from an authority that is itself a PNRR beneficiary', "s.winner_key in (select cui from pnrr_co) and s.authority_cui in (select cui from pnrr_ben)")
metric('2c. … from a PNRR-beneficiary authority, awarded 2022 or later', "s.winner_key in (select cui from pnrr_co) and s.authority_cui in (select cui from pnrr_ben) and s.award_date >= date '2022-01-01'")
# rule 3: payment CUIs with no project
con.execute("create or replace table nonben as select cui, list(distinct cri) cris, sum(val) val from pnrr_pay where cui not in (select cui from pnrr_ben) group by cui")
s = con.execute("select count(*), round(sum(val)/1e9,2), count(*) filter (where cui in (select cui from sup)) from nonben").fetchone()
note(f"Direct-payment non-beneficiary CUIs {s[0]} ({s[1]} bn RON paid), of which SEAP suppliers {s[2]}")
metric('3a. Non-beneficiary payee wins any SEAP award', "s.winner_key in (select cui from nonben)")
# ministry authority keys by name
cri_names = con.execute("select distinct cri, cri_name from pnrr_pay where cui in (select cui from nonben)").fetchall()
con.execute("create or replace table cri_auth(cri varchar, akey varchar)")
for cri, nm in cri_names:
    keys = con.execute("select distinct e.key from b.entity e where e.key in (select authority_key from b.rec) and upper(strip_accents(e.display_name)) = upper(strip_accents(?))", [nm]).fetchall()
    for (k,) in keys: con.execute("insert into cri_auth values (?,?)", [cri, k])
mapped = con.execute("select count(distinct cri) from cri_auth").fetchone()[0]
note(f"Paying ministries (cri codes) {len(cri_names)}, matched to a SEAP authority by exact name {mapped}: {sorted(c for c, in con.execute('select distinct cri from cri_auth').fetchall())}; unmatched: {sorted(c for c,_ in cri_names if c not in [x for x, in con.execute('select cri from cri_auth').fetchall()])}")
metric('3b. … from the ministry that paid it', "exists (select 1 from nonben n, unnest(n.cris) u(c) join cri_auth a on a.cri=u.c where n.cui=s.winner_key and a.akey=s.authority_key)")
# rule 4: company beneficiary registered shortly before commitment
for months in (6, 12):
    con.execute(f"""create or replace table young{months} as select p.*, c.reg from pnrr_proj p join company c using (cui)
       where p.angaj is not null and c.reg <= p.angaj and c.reg > p.angaj - interval {months} month""")
    s = con.execute(f"""select count(*), count(distinct cui), round(sum(val)/1e9,2),
       (select count(*) from pnrr_proj p join company c using (cui) where p.angaj is not null),
       count(distinct cui) filter (where cui in (select cui from sup)) from young{months}""").fetchone()
    note(f"4. Registered ≤{months} months before data_angajament: {s[0]} of {s[3]} company projects, {s[1]} CUIs, {s[2]} bn RON contracted; {s[4]} of those CUIs are SEAP suppliers")
    metric(f'4. ({months} m) young PNRR beneficiary also wins SEAP', f"s.winner_key in (select cui from young{months})")
s = con.execute("select tip, count(*) from young12 group by 1 order by 2 desc limit 4").fetchall()
note(f"4. 12-month set by beneficiary type: {s}")

# ===================== STATE AID
raw = []
for d in ('/tmp/sa-sorted', '/tmp/sa-full'):
    for f in sorted(glob.glob(d + '/p*.json')):
        try: raw.extend(json.load(open(f, encoding='utf-8-sig')))
        except ValueError: pass
seen, rows = set(), []
for r in raw:
    k = json.dumps(r, sort_keys=True)
    if k not in seen: seen.add(k); rows.append(r)
con.execute("create or replace table sa(cui varchar, name varchar, amt double, granted varchar, fin varchar)")
con.executemany("insert into sa values (?,?,?,?,?)", [(ncui(r.get('cui')), r.get('denumireBeneficiar'), r.get('ajutorAcordatSubcategorie') or 0, r.get('dataAcordare'), r.get('finantator')) for r in rows])
con.execute("create or replace table sa_ben as select cui, any_value(name) name, sum(amt) amt from sa where cui is not null group by cui")
PUB = r"\b(MUNICIPI|ORAS|COMUNA|JUDET|PRIMARIA|CONSILIUL|REGIA AUTONOMA|COMPANIA NATIONALA|SOCIETATEA NATIONALA|UNIVERSITAT|SPITAL|AEROPORT|ADMINISTRATIA)"
pub = [c for c, n in con.execute("select cui, name from sa_ben").fetchall() if re.search(PUB, norm(n))]
con.execute("create or replace table sa_pub(cui varchar)"); con.executemany("insert into sa_pub values (?)", [(c,) for c in pub])
section('State aid')
s = con.execute("""select (select count(*) from sa), (select count(*) from sa_ben), round((select sum(amt) from sa_ben)/1e9,1),
  (select count(*) from sa_ben where cui in (select cui from sup)), (select count(*) from sa_ben where amt>=1e7),
  (select count(*) from sa_ben where amt>=1e7 and cui in (select cui from sup)),
  (select count(*) from sa_pub), (select count(*) from sa_pub where cui in (select cui from sup)), (select count(*) from sa_pub where cui in (select cui from auth))""").fetchone()
note(f"Distinct RegAS rows {s[0]}; beneficiary CUIs {s[1]} ({s[2]} bn RON); SEAP suppliers {s[3]}; aid ≥10M RON {s[4]}, of which SEAP suppliers {s[5]}; public-body names {s[6]}, of which SEAP suppliers {s[7]}, SEAP authorities {s[8]}")
metric('Base. Aid beneficiary wins any SEAP award', "s.winner_key in (select cui from sa_ben)")
metric('2. Aid ≥10M RON firm wins SEAP', "s.winner_key in (select cui from sa_ben where amt>=1e7)")
metric('3a. Public-body aid beneficiary wins SEAP (as supplier)', "s.winner_key in (select cui from sa_pub)")
authmetric('3b. Public-body aid beneficiary awards SEAP (as authority)', "select cui from sa_pub")
# rule 1 cheap: granting authority name exactly equals SEAP authority display name
con.execute("""create or replace table sa_fin as select distinct s.cui, e.key akey from sa s join b.entity e
   on upper(strip_accents(trim(e.display_name))) = upper(strip_accents(trim(s.fin))) where s.cui is not null and e.key in (select authority_key from b.rec)""")
metric('1. Aid and SEAP award from the same authority (exact name)', "exists (select 1 from sa_fin f where f.cui=s.winner_key and f.akey=s.authority_key)")
note(f"1. Granting-authority names matched to a SEAP authority: {con.execute('select count(distinct akey) from sa_fin').fetchone()[0]} of {con.execute('select count(distinct fin) from sa').fetchone()[0]}")

# ===================== POCU
wb = openpyxl.load_workbook('/tmp/sig127-pnrr/pocu/pocu.xlsx', read_only=True); ws = wb.worksheets[0]
it = ws.iter_rows(values_only=True, max_col=30)
for r in it:
    if r and any(isinstance(c, str) and c.startswith('Denumire beneficiar') for c in r): hdr = r; break
ib = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith('Denumire beneficiar'))
ist = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith('Data de începere'))
ival = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith('Valoarea ELIGIB'))
LEAD = re.compile(r"^\s*L\s*:\s*(.*?)\s*CUI\s*:?\s*(?:RO)?\s*(\d{2,10})\b", re.S)
PART = re.compile(r"(?:^|[\s;,-])(\d{4,10})\s*-\s*([^;]+?)(?=(?:\d{4,10}\s*-)|;|$)", re.S)
def pdate(v):
    if isinstance(v, datetime.datetime): return v.date()
    if isinstance(v, str):
        m = re.search(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", v)
        if m:
            try: return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            except ValueError: return None
    return None
pr, nproj = [], 0
for r in it:
    cell = r[ib] if len(r) > ib else None
    if not isinstance(cell, str) or 'L:' not in cell: continue
    nproj += 1
    st = pdate(r[ist]); val = r[ival] if isinstance(r[ival], (int, float)) else 0
    m = LEAD.search(cell)
    if m: pr.append(('L', str(int(m.group(2))), st, val, nproj))
    tail = cell.split('PARTENERI', 1)[1] if 'PARTENERI' in cell else ''
    for pm in PART.finditer(re.sub(r"^\s*:?\s*-?\s*", "", tail)): pr.append(('P', str(int(pm.group(1))), st, 0, nproj))
con.execute("create or replace table pocu(role varchar, cui varchar, start date, val double, proj int)")
con.executemany("insert into pocu values (?,?,?,?,?)", pr)
con.execute("create or replace table pocu_ben as select distinct cui from pocu")
con.execute("create or replace table pocu_co as select cui from pocu_ben join company using (cui)")
section('EU cohesion funds (POCU 2014–2020 only)')
s = con.execute("""select count(distinct proj), (select count(*) from pocu_ben), (select count(*) from pocu_co),
  (select count(*) from pocu_ben where cui in (select cui from sup)), (select count(*) from pocu_co where cui in (select cui from sup)),
  count(*) filter (where start is null) from pocu""").fetchone()
note(f"POCU projects with a CUI-bearing leader cell {s[0]}; beneficiary CUIs (leaders + partners) {s[1]}; in ONRC as companies {s[2]}; SEAP suppliers {s[3]} (companies {s[4]}); rows without start date {s[5]}")
metric('2a. POCU beneficiary (leader or partner) wins any SEAP award', "s.winner_key in (select cui from pocu_ben)")
metric('2a. … company beneficiaries only (in ONRC)', "s.winner_key in (select cui from pocu_co)")
for months in (6, 12):
    s = con.execute(f"""with y as (select p.* from pocu p join company c using (cui) where p.start is not null and c.reg <= p.start and c.reg > p.start - interval {months} month)
      select count(distinct proj), count(distinct cui), count(distinct cui) filter (where cui in (select cui from sup)),
      (select count(distinct proj) from pocu p join company c using (cui) where p.start is not null) from y""").fetchone()
    note(f"1. Company beneficiary registered ≤{months} months before project start: {s[0]} of {s[3]} projects with a company beneficiary, {s[1]} CUIs, of which SEAP suppliers {s[2]}")

with open('/tmp/sig127-pnrr/raw_results.txt', 'w') as f:
    for o in out:
        f.write('\t'.join(str(x) if not isinstance(x, float) else f'{x:.3f}' for x in o) + '\n')
print(open('/tmp/sig127-pnrr/raw_results.txt').read())
