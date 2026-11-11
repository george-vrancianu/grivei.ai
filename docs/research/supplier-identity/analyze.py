"""Measure supplier identity variants in the extracted SEAP bulk sample.

Usage: python -I analyze.py <work.tsv> <out_dir>
Writes <out_dir>/winners.pkl (deduplicated winner rows) and prints the report tables.
"""
import collections, pickle, re, sys, unicodedata, random

WORK, OUT = sys.argv[1], sys.argv[2]

# ---------- CUI normalisation ----------
KEY = '753217532'

def cif_valid(d):
    """Romanian CIF control digit (ANAF algorithm). d: digit string without leading zeros."""
    if not (2 <= len(d) <= 10):
        return False
    body, ctrl = d[:-1].rjust(9, '0'), int(d[-1])
    s = sum(int(a) * int(b) for a, b in zip(body, KEY))
    c = s * 10 % 11
    return (0 if c == 10 else c) == ctrl

CNP_KEY = '279146358279'

def cnp_valid(d):
    if len(d) != 13 or d[0] == '0':
        return False
    s = sum(int(a) * int(b) for a, b in zip(d[:12], CNP_KEY))
    c = s % 11
    return (1 if c == 10 else c) == int(d[12])

FOREIGN_PREFIX = re.compile(r'^(ATU|AT|BE|BG|CY|CZ|DE|DK|EE|EL|GR|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|SE|SI|SK|CHE|CH|GB|UK|NO|MD|RS|TR|US|EIN|TIN|IL|UA)[\s\-.]*[0-9A-Z]', re.I)
SCI = re.compile(r'^\d+(\.\d+)?E\+\d+$', re.I)
JUNK_ONLY = re.compile(r'^[\s\-.,/_*N/A]*$', re.I)
TRADE_REG = re.compile(r'^\s*[JFC]\s*\d{1,2}\s*/', re.I)


def classify(raw, cell):
    """Return (category, normalised_cui_or_None, set_of_format_flags)."""
    flags = set()
    s = raw.replace('<TAB>', ' ').replace('<LF>', ' ').replace('<CR>', ' ').replace(' ', ' ')
    if cell == 'num':
        flags.add('xlsx_numeric_cell')
    if s != s.strip():
        flags.add('outer_whitespace')
    s = s.strip()
    if s == '' or s.upper() in ('N/A', 'NA') or JUNK_ONLY.match(s):
        return 'blank', None, flags
    if SCI.match(s):
        return 'excel_scientific', None, flags
    if TRADE_REG.match(s):
        return 'trade_register_no', None, flags
    t = s.upper()
    m = re.match(r'^(CUI|CIF|C\.F\.|CF)\s*[:.]?\s*', t)
    if m:
        flags.add('label_prefix'); t = t[m.end():]
    m = re.match(r'^RO[\s\-.]*', t)
    if m and re.match(r'^RO[\s\-.]*\d', t):
        flags.add('ro_prefix')
        if s[:2] != 'RO':
            flags.add('ro_lowercase')
        if m.group(0) != 'RO':
            flags.add('ro_with_separator')
        t = t[m.end():]
    elif FOREIGN_PREFIX.match(t) and not t[:2].isdigit():
        return 'foreign_vat_format', None, flags
    t2 = re.sub(r'^[\s%:;,.`+/\-]+|[\s%:;,.`+/\-]+$', '', t)
    if t2 != t:
        flags.add('stray_punctuation'); t = t2
    if re.search(r'\s', t) and re.fullmatch(r'[\d\s]+', t):
        flags.add('inner_whitespace'); t = re.sub(r'\s', '', t)
    if not t.isdigit():
        if re.search(r'[A-Z]{3,}', t):
            return 'text_not_a_code', None, flags
        return 'other_junk', None, flags
    if t.startswith('0'):
        flags.add('leading_zeros'); t = t.lstrip('0')
        if not t:
            return 'blank', None, flags
    if cif_valid(t):
        return 'valid_ro_cui', t, flags
    if len(t) == 13 and cnp_valid(t):
        return 'cnp_like_13_digits', None, flags
    if len(t) > 10:
        return 'too_long_digits', None, flags
    return 'invalid_check_digit', t, flags

# ---------- name normalisation ----------
LEGAL = {'SC', 'S', 'C', 'SRL', 'R', 'L', 'SA', 'A', 'SRLD', 'D', 'SNC', 'SCS', 'SCA', 'SOCIETATEA', 'COMERCIALA',
         'COMPANIA', 'SOCIETATE', 'CU', 'RASPUNDERE', 'LIMITATA', 'PE', 'ACTIUNI'}

def strip_diacritics(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

def name_l1(n):
    return re.sub(r'\s+', ' ', n).strip().upper()

def name_l2(n):
    t = strip_diacritics(name_l1(n))
    t = re.sub(r'[^A-Z0-9 ]+', ' ', t)
    toks = [x for x in t.split() if x not in LEGAL]
    return ' '.join(toks)

CONSORTIUM = re.compile(r'\b(ASOCIERE|ASOCIEREA|ASOCIERII|CONSORTIU|CONSORTIUM|JOINT VENTURE|JV|LIDER|LEADER)\b', re.I)

# ---------- load & deduplicate ----------
seen_simple = set()          # DA / DAN record ids
contracts = {}               # (rec_id, contract_no) -> dict(value, winners{ident: row}, file)
rows_total = collections.Counter()
winners = []                 # finalised later

def ident(cat, norm, raw, name):
    return ('C', norm) if cat == 'valid_ro_cui' else ('R', raw.strip(), name_l1(name))

simple_rows = []
with open(WORK, encoding='utf-8') as f:
    for line in f:
        stem, kind, rid, cno, lot, val, name, cui, cell, country, auth = line.rstrip('\n').split('\t')
        rows_total[kind] += 1
        try:
            v = float(val) if val and not val.startswith('BAD') else 0.0
        except ValueError:
            v = 0.0
        cat, norm, flags = classify(cui, cell)
        rec = dict(file=stem, kind=kind, rid=rid, name=name, raw=cui, cell=cell, country=country,
                   auth=auth.split('.')[0].strip(), cat=cat, norm=norm, flags=flags)
        if kind in ('DA', 'DAN'):
            if rid in seen_simple:
                continue
            seen_simple.add(rid)
            rec['value'] = v
            simple_rows.append(rec)
        else:
            key = (rid, cno)
            c = contracts.get(key)
            if c is None:
                c = contracts[key] = dict(file=stem, value=v, winners={})
            elif c['file'] != stem:
                continue  # same contract re-published in a later sampled quarter
            c['value'] = max(c['value'], v)
            c['winners'].setdefault(ident(cat, norm, cui, name), rec)

for c in contracts.values():
    n = len(c['winners'])
    for rec in c['winners'].values():
        rec['value'] = c['value'] / n
        rec['n_winners'] = n
        winners.append(rec)
for rec in simple_rows:
    rec['n_winners'] = 1
    winners.append(rec)
del simple_rows

pickle.dump(winners, open(f'{OUT}/winners.pkl', 'wb'))

def pct(a, b):
    return f'{100 * a / b:.2f}%' if b else 'n/a'

def ron(x):
    return f'{x / 1e9:,.2f} bn' if x >= 1e8 else f'{x / 1e6:,.1f} M'

print('# Raw rows by kind:', dict(rows_total))
tot_rows = len(winners); tot_ron = sum(r['value'] for r in winners)
by_kind = collections.defaultdict(lambda: [0, 0.0])
for r in winners:
    by_kind[r['kind']][0] += 1; by_kind[r['kind']][1] += r['value']
print('# Deduplicated winner rows:', tot_rows, 'RON', ron(tot_ron))
for k, (n, v) in sorted(by_kind.items()):
    print(f'   {k}: {n:,} rows, {ron(v)}')
print('# Contracts (distinct notice+contract no):', len(contracts),
      ' with >1 winner:', sum(1 for c in contracts.values() if len(c['winners']) > 1))

# ---------- 1. categories ----------
print('\n## Category of supplier CUI value (deduplicated winner rows)')
cat = collections.defaultdict(lambda: [0, 0.0, collections.Counter()])
for r in winners:
    e = cat[r['cat']]; e[0] += 1; e[1] += r['value']; e[2][r['kind']] += 1
for k, (n, v, kinds) in sorted(cat.items(), key=lambda x: -x[1][0]):
    print(f'| {k} | {n:,} | {pct(n, tot_rows)} | {ron(v)} | {pct(v, tot_ron)} | {dict(kinds)} |')

print('\n## Category by kind (rows, RON share within kind)')
for kind in sorted(by_kind):
    sub = [r for r in winners if r['kind'] == kind]
    kv = sum(r['value'] for r in sub)
    cc = collections.defaultdict(lambda: [0, 0.0])
    for r in sub:
        cc[r['cat']][0] += 1; cc[r['cat']][1] += r['value']
    print(kind, {k: (n, pct(n, len(sub)), pct(v, kv)) for k, (n, v) in sorted(cc.items(), key=lambda x: -x[1][0])})

# examples per category
print('\n## Examples per category')
ex = collections.defaultdict(list)
for r in winners:
    if r['cat'] != 'valid_ro_cui' and len(ex[r['cat']]) < 8 and (r['raw'], r['name']) not in [(a, b) for a, b, *_ in ex[r['cat']]]:
        ex[r['cat']].append((r['raw'], r['name'], r['country'], r['file']))
for k, v in ex.items():
    print(k, v)

# ---------- 2. format variants among valid CUIs ----------
print('\n## Format flags on rows whose CUI normalises to a valid Romanian CUI')
valid = [r for r in winners if r['cat'] == 'valid_ro_cui']
vrows = len(valid); vron = sum(r['value'] for r in valid)
fl = collections.defaultdict(lambda: [0, 0.0])
clean = [0, 0.0]
for r in valid:
    f2 = r['flags'] - {'xlsx_numeric_cell'}
    if not f2:
        clean[0] += 1; clean[1] += r['value']
    for x in r['flags']:
        fl[x][0] += 1; fl[x][1] += r['value']
print(f'| plain digits, no fix needed | {clean[0]:,} | {pct(clean[0], vrows)} | {pct(clean[1], vron)} |')
for k, (n, v) in sorted(fl.items(), key=lambda x: -x[1][0]):
    print(f'| {k} | {n:,} | {pct(n, vrows)} | {pct(v, vron)} |')

print('\n## Format flags by file (share of valid rows with RO prefix / whitespace / numeric cell)')
byf = collections.defaultdict(collections.Counter)
for r in valid:
    byf[r['file']]['n'] += 1
    for x in r['flags']:
        byf[r['file']][x] += 1
for fn in sorted(byf):
    c = byf[fn]
    print(fn, c['n'], {k: pct(v, c['n']) for k, v in c.items() if k != 'n'})

raw_per_norm = collections.defaultdict(set)
for r in valid:
    raw_per_norm[r['norm']].add(r['raw'])
all_raw = set(); [all_raw.update(s) for s in raw_per_norm.values()]
print('\n## Collapse: distinct raw strings', len(all_raw), '-> distinct valid normalised CUIs', len(raw_per_norm))
dist = collections.Counter(min(len(s), 5) for s in raw_per_norm.values())
print('raw spellings per normalised CUI (5 = 5+):', sorted(dist.items()))
multi = sorted(raw_per_norm.items(), key=lambda x: -len(x[1]))[:5]
for k, s in multi:
    print('  ', k, sorted(s)[:10])

# invalid check digit: recoverable by name?
print('\n## Invalid check digits')
name2cuis = collections.defaultdict(collections.Counter)
for r in valid:
    n2 = name_l2(r['name'])
    if n2:
        name2cuis[n2][r['norm']] += 1
inv = [r for r in winners if r['cat'] == 'invalid_check_digit']
rec_unique = rec_multi = rec_none = 0; recv = 0.0
inv_ex = []
for r in inv:
    cs = name2cuis.get(name_l2(r['name']))
    if not cs:
        rec_none += 1
    elif len(cs) == 1:
        rec_unique += 1; recv += r['value']
        if len(inv_ex) < 10:
            inv_ex.append((r['raw'], r['name'], list(cs)[0]))
    else:
        rec_multi += 1
print('invalid rows', len(inv), 'name maps to exactly one valid CUI', rec_unique, ron(recv), 'to several', rec_multi, 'to none', rec_none)
for e in inv_ex:
    print('  ', e)
inv_by_country = collections.Counter(r['country'] or '(no country col)' for r in inv)
print('invalid by country column:', inv_by_country.most_common(8))
inv_len = collections.Counter(len(r['norm']) for r in inv)
print('invalid by digit length:', sorted(inv_len.items()))

# self reference
selfref = [r for r in valid if r['norm'] == r['auth'].lstrip('0') or ('RO' + r['norm']) == r['auth'].upper().replace(' ', '')]
print('\n## Supplier CUI equals the contracting authority CUI:', len(selfref), 'rows', ron(sum(r['value'] for r in selfref)),
      pct(sum(r['value'] for r in selfref), tot_ron))
sr_kind = collections.Counter(r['kind'] for r in selfref); print('  by kind', sr_kind)
for r in sorted(selfref, key=lambda r: -r['value'])[:10]:
    print('  ', r['file'], r['rid'], r['raw'], '|', r['name'], '|', ron(r['value']))

# ---------- 3. foreign / consortia / no usable CUI ----------
print('\n## Rows without a usable CUI: why')
nou = [r for r in winners if r['cat'] != 'valid_ro_cui']
def reason(r):
    if r['country'] and r['country'] != 'Romania':
        return 'foreign (country column)'
    if r['cat'] in ('foreign_vat_format',):
        return 'foreign (VAT prefix)'
    if CONSORTIUM.search(r['name']):
        return 'consortium name'
    return r['cat']
rs = collections.defaultdict(lambda: [0, 0.0])
for r in nou:
    e = rs[reason(r)]; e[0] += 1; e[1] += r['value']
print(f'total without usable CUI: {len(nou):,} rows ({pct(len(nou), tot_rows)}), {ron(sum(r["value"] for r in nou))} ({pct(sum(r["value"] for r in nou), tot_ron)})')
for k, (n, v) in sorted(rs.items(), key=lambda x: -x[1][1]):
    print(f'| {k} | {n:,} | {pct(n, tot_rows)} | {ron(v)} | {pct(v, tot_ron)} |')
print('top no-usable-CUI rows by RON:')
for r in sorted(nou, key=lambda r: -r['value'])[:15]:
    print('  ', r['file'], r['rid'], repr(r['raw']), '|', r['name'][:70], '|', r['country'], '|', ron(r['value']))

# foreign suppliers with a valid-looking RO CUI (country column says foreign)
fv = [r for r in valid if r['country'] and r['country'] != 'Romania']
print('\nvalid-checksum CUI but foreign country column:', len(fv), ron(sum(r['value'] for r in fv)))
for r in fv[:8]:
    print('  ', r['raw'], r['name'], r['country'])
fc = collections.Counter(r['country'] for r in winners if r['country'])
print('rows with a country column:', sum(fc.values()), 'non-Romania:', sum(v for k, v in fc.items() if k != 'Romania'))

# consortium-named rows
cons = [r for r in winners if CONSORTIUM.search(r['name'])]
print('\n## Consortium-looking names:', len(cons), 'rows', ron(sum(r['value'] for r in cons)),
      'by cat', collections.Counter(r['cat'] for r in cons).most_common())
for r in sorted(cons, key=lambda r: -r['value'])[:8]:
    print('  ', repr(r['raw']), '|', r['name'][:100], '|', ron(r['value']), '| n_winners', r['n_winners'])
multiwin = [r for r in winners if r['n_winners'] > 1]
print('rows in multi-winner contracts:', len(multiwin), ron(sum(r['value'] for r in multiwin)), pct(sum(r['value'] for r in multiwin), tot_ron))

# CNP-like
cnp = [r for r in winners if r['cat'] == 'cnp_like_13_digits']
print('\n## CNP-like (personal numeric code) supplier ids:', len(cnp), ron(sum(r['value'] for r in cnp)))

# ---------- 4. name variants under one CUI ----------
print('\n## Name variants per valid normalised CUI')
names0 = collections.defaultdict(collections.Counter)
names1 = collections.defaultdict(set)
names2 = collections.defaultdict(set)
cui_ron = collections.Counter(); cui_rows = collections.Counter()
for r in valid:
    names0[r['norm']][r['name']] += 1
    names1[r['norm']].add(name_l1(r['name']))
    names2[r['norm']].add(name_l2(r['name']))
    cui_ron[r['norm']] += r['value']; cui_rows[r['norm']] += 1
ncui = len(names0)
def bucket(n):
    return '1' if n == 1 else '2' if n == 2 else '3-5' if n <= 5 else '6-10' if n <= 10 else '11+'
for label, d in (('exact string', {k: len(v) for k, v in names0.items()}),
                 ('case+space folded', {k: len(v) for k, v in names1.items()}),
                 ('diacritics/punct/legal form stripped', {k: len(v) for k, v in names2.items()})):
    b = collections.defaultdict(lambda: [0, 0, 0.0])
    for k, n in d.items():
        e = b[bucket(n)]; e[0] += 1; e[1] += cui_rows[k]; e[2] += cui_ron[k]
    print(label)
    for bk in ('1', '2', '3-5', '6-10', '11+'):
        n, rr, v = b[bk]
        print(f'   | {bk} | {n:,} CUIs ({pct(n, ncui)}) | {pct(rr, vrows)} of rows | {pct(v, vron)} of RON |')
print('CUIs:', ncui)
top = sorted(names0, key=lambda k: -len(names0[k]))[:5]
for k in top:
    print('  most spellings', k, len(names0[k]), [n for n, _ in names0[k].most_common(12)])
# a few typical cases among top-RON
print('typical (top-RON CUIs with >1 spelling):')
for k in sorted(names0, key=lambda k: -cui_ron[k])[:40]:
    if len(names0[k]) > 1:
        print('  ', k, ron(cui_ron[k]), len(names0[k]), [n for n, _ in names0[k].most_common(6)])

# ---------- 5. one CUI, clearly different names ----------
def toks(n):
    return set(t for t in n.split() if len(t) > 2)
print('\n## One CUI, names sharing no token (after stripping legal forms)')
disjoint = []
for k, s in names2.items():
    s = [x for x in s if x]
    if len(s) < 2:
        continue
    ts = [toks(x) for x in s]
    # find a pair with no shared token
    found = None
    for i in range(len(s)):
        for j in range(i + 1, len(s)):
            if ts[i] and ts[j] and not (ts[i] & ts[j]):
                found = (s[i], s[j]); break
        if found:
            break
    if found:
        disjoint.append((k, found))
dj_rows = sum(cui_rows[k] for k, _ in disjoint); dj_ron = sum(cui_ron[k] for k, _ in disjoint)
print('CUIs with a disjoint-name pair:', len(disjoint), pct(len(disjoint), ncui), 'rows', dj_rows, 'RON', ron(dj_ron), pct(dj_ron, vron))
for k, p in sorted(disjoint, key=lambda x: -cui_ron[x[0]])[:30]:
    print('  ', k, ron(cui_ron[k]), [n for n, _ in names0[k].most_common(5)])

# ---------- 6. one name, several CUIs ----------
print('\n## One normalised name, several valid CUIs')
n2c = collections.defaultdict(set)
for k, s in names2.items():
    for x in s:
        if x:
            n2c[x].add(k)
multi_c = {n: cs for n, cs in n2c.items() if len(cs) > 1}
print('names with >1 CUI:', len(multi_c), ' CUIs involved:', len(set().union(*multi_c.values())) if multi_c else 0)
distinctive = {n: cs for n, cs in multi_c.items() if len(n) >= 12 and len(n.split()) >= 2}
print('of which distinctive (>=2 tokens, >=12 chars):', len(distinctive))
for n, cs in sorted(distinctive.items(), key=lambda x: -sum(cui_ron[c] for c in x[1]))[:25]:
    print('  ', n, [(c, ron(cui_ron[c]), cui_rows[c]) for c in sorted(cs)])

pickle.dump(dict(names0=names0, cui_ron=cui_ron, cui_rows=cui_rows, disjoint=disjoint,
                 distinctive={n: sorted(c) for n, c in distinctive.items()}), open(f'{OUT}/cui_names.pkl', 'wb'))
