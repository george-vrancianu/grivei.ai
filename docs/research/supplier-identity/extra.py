"""Extra measurements on winners.pkl: legal-form artefact, concentration, typos, foreign ids.

Usage: python -I extra.py <winners.pkl> <anaf.json>
"""
import collections, pickle, re, sys, json
W = pickle.load(open(sys.argv[1], 'rb'))
A = json.load(open(sys.argv[2]))
tot = sum(r['value'] for r in W)

# 1. doubled legal form like "S.C. X S.R.L. S.R.L." or "S.C. S.C. ..."
dbl = re.compile(r'(S\.?R\.?L\.?|S\.?A\.?)\s*(S\.?R\.?L\.?|S\.?A\.?)\s*$|^S\.C\.\s*S\.?C\.?\s', re.I)
sc_pref = collections.Counter(); n_by = collections.Counter(); dbl_by = collections.Counter()
for r in W:
    n_by[r['file']] += 1
    if r['name'].startswith('S.C. '):
        sc_pref[r['file']] += 1
    if dbl.search(r['name'].strip()):
        dbl_by[r['file']] += 1
print('## "S.C. " prefix and doubled legal form, by file')
for f in sorted(n_by):
    print(f, n_by[f], 'S.C. prefix', f'{100*sc_pref[f]/n_by[f]:.1f}%', 'doubled', dbl_by[f])

# 2. concentration of no-usable-CUI RON
nou = sorted([r for r in W if r['cat'] != 'valid_ro_cui'], key=lambda r: -r['value'])
nv = sum(r['value'] for r in nou)
for k in (5, 20, 100):
    s = sum(r['value'] for r in nou[:k])
    print(f'top {k} no-CUI rows: {s/1e9:.1f} bn = {100*s/nv:.0f}% of no-CUI RON')
print('no-CUI RON by kind:', {k: f'{v/1e9:.2f} bn' for k, v in collections.Counter({}).items()})
bk = collections.defaultdict(float); bn = collections.Counter()
for r in nou:
    bk[r['kind']] += r['value']; bn[r['kind']] += 1
print({k: (bn[k], f'{v/1e9:.2f} bn') for k, v in bk.items()})
# by year
by = collections.defaultdict(lambda: [0, 0.0, 0.0])
for r in W:
    y = r['file'][:4]; by[y][2] += r['value']
    if r['cat'] != 'valid_ro_cui':
        by[y][0] += 1; by[y][1] += r['value']
print('no-CUI by sampled quarter:', {y: (n, f'{100*v/t:.1f}% RON') for y, (n, v, t) in sorted(by.items())})
# excluding contracts above 1 bn RON
big = [r for r in W if r['value'] >= 1e9]
print('rows >= 1 bn RON:', len(big), f'{sum(r["value"] for r in big)/1e9:.1f} bn', 'of which no-CUI', sum(1 for r in big if r['cat'] != 'valid_ro_cui'))
sm = [r for r in W if r['value'] < 1e9]; smt = sum(r['value'] for r in sm)
print('no-CUI RON share among rows < 1 bn:', f'{100*sum(r["value"] for r in sm if r["cat"] != "valid_ro_cui")/smt:.2f}%')

# 3. invalid check digit: Romanian-looking (<=8 digits, no foreign country)
inv = [r for r in W if r['cat'] == 'invalid_check_digit']
ro_like = [r for r in inv if len(r['norm']) <= 8 and (not r['country'] or r['country'] == 'Romania')]
print('\n## invalid check digit:', len(inv), 'RO-looking (<=8 digits, not foreign):', len(ro_like),
      f'{sum(r["value"] for r in ro_like)/1e6:.1f} M RON', collections.Counter(r['kind'] for r in ro_like))
print('  10-digit invalid:', sum(1 for r in inv if len(r['norm']) == 10), f'{sum(r["value"] for r in inv if len(r["norm"]) >= 9)/1e9:.1f} bn RON for 9-10 digit')

# 4. foreign ids as keys
fid = collections.defaultdict(set)
for r in W:
    if r['cat'] in ('foreign_vat_format', 'invalid_check_digit', 'too_long_digits', 'other_junk') and \
            (r['cat'] != 'invalid_check_digit' or len(r['norm']) >= 9):
        k = re.sub(r'[^0-9A-Z]', '', r['raw'].upper())
        fid[k].add(r['name'].strip().upper())
print('\n## non-RO ids (normalised to [0-9A-Z]):', len(fid), 'with >1 name spelling:', sum(1 for v in fid.values() if len(v) > 1))
for k, v in sorted(fid.items(), key=lambda x: -len(x[1]))[:6]:
    print('  ', k, sorted(v)[:5])

# 5. multi-winner involvement of names unlike ANAF (from disjoint sample)
anaf = {str(f['date_generale']['cui']): f['date_generale']['denumire'] for f in A['found']}
# 6. "valid checksum" foreign: 10-digit valid CUIs
ten = [r for r in W if r['cat'] == 'valid_ro_cui' and len(r['norm']) == 10]
print('\n## 10-digit CUIs passing the RO check digit:', len(ten), f'{sum(r["value"] for r in ten)/1e9:.2f} bn', [(r['raw'], r['name']) for r in ten[:6]])
nine = collections.Counter(len(r['norm']) for r in W if r['cat'] == 'valid_ro_cui')
print('valid CUI digit-length distribution:', sorted(nine.items()))

# 7. self-reference broader: supplier CUI that is also seen as an authority CUI anywhere
auths = set(r['auth'].lstrip('0') for r in W)
sa = [r for r in W if r['cat'] == 'valid_ro_cui' and r['norm'] in auths]
sav = sum(r['value'] for r in sa)
print('\n## supplier CUI is a contracting-authority CUI somewhere in the sample:', len(sa), f'{sav/1e9:.2f} bn', f'{100*sav/tot:.2f}%')
same = [r for r in sa if r['norm'] == r['auth'].lstrip('0')]
print('   of which equal to the same row\'s authority:', len(same), f'{sum(r["value"] for r in same)/1e9:.2f} bn')
print('   by kind:', collections.Counter(r['kind'] for r in sa))
# authorities selling to authorities is legitimate (e.g. public companies). show top names
c = collections.Counter()
for r in sa: c[(r['norm'], r['name'][:50])] += r['value']
for (k, n), v in c.most_common(12): print('   ', k, n, f'{v/1e6:.0f} M')

# 8. PFA / individuals
pfa = [r for r in W if re.search(r'\b(PFA|P\.F\.A\.|PERSOANA FIZICA|I\.I\.|INTREPRINDERE INDIVIDUALA|CABINET)\b', r['name'], re.I)]
print('\n## names that look like individuals/PFA/II/cabinets:', len(pfa), 'valid CUI:', sum(1 for r in pfa if r['cat'] == 'valid_ro_cui'))
