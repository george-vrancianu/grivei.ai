"""Compare ANAF canonical names with SEAP name spellings for the sampled CUIs.

Usage: python -I anaf_eval.py <cui_names.pkl> <anaf.json>
"""
import collections, json, pickle, sys, re
d = pickle.load(open(sys.argv[1], 'rb'))
a = json.load(open(sys.argv[2]))
names0, cui_ron, cui_rows = d['names0'], d['cui_ron'], d['cui_rows']

import unicodedata
LEGAL = {'SC', 'S', 'C', 'SRL', 'R', 'L', 'SA', 'A', 'SRLD', 'D', 'SNC', 'SCS', 'SCA', 'SOCIETATEA', 'COMERCIALA',
         'COMPANIA', 'SOCIETATE', 'CU', 'RASPUNDERE', 'LIMITATA', 'PE', 'ACTIUNI'}
def l2(n):
    t = ''.join(c for c in unicodedata.normalize('NFKD', n.upper()) if not unicodedata.combining(c))
    t = re.sub(r'[^A-Z0-9 ]+', ' ', t)
    return ' '.join(x for x in t.split() if x not in LEGAL)
def toks(n): return set(x for x in n.split() if len(x) > 2)
def match(seap, anaf):
    s, t = l2(seap), l2(anaf)
    if s == t: return 'exact'
    if s.replace(' ', '') == t.replace(' ', ''): return 'exact'
    if s and (s in t or t in s): return 'contained'
    ts, tt = toks(s), toks(t)
    if ts and tt and len(ts & tt) / len(ts | tt) >= 0.5: return 'similar'
    if ts & tt: return 'overlap'
    return 'different'

anaf = {str(f['date_generale']['cui']): f for f in a['found']}
states = collections.Counter()
for f in anaf.values():
    g = f['date_generale']
    st = g['stare_inregistrare'].split(' din ')[0]
    states[st] += 1
print('ANAF stare_inregistrare:', states.most_common())
print('inactive flag:', sum(1 for f in anaf.values() if f['stare_inactiv']['statusInactivi']),
      'radiated date:', sum(1 for f in anaf.values() if f['stare_inactiv']['dataRadiere']))
print('empty denumire:', sum(1 for f in anaf.values() if not f['date_generale']['denumire'].strip()))
cases = collections.Counter(('upper' if g == g.upper() else 'mixed') for g in (f['date_generale']['denumire'] for f in anaf.values()))
print('ANAF name casing:', cases)
dia = sum(1 for f in anaf.values() if re.search('[ĂÂÎŞŢȘȚăâîşţșț]', f['date_generale']['denumire']))
print('ANAF names with diacritics:', dia, 'cedilla:', sum(1 for f in anaf.values() if re.search('[ŞŢşţ]', f['date_generale']['denumire'])))
forms = collections.Counter(f['date_generale']['forma_juridica'] for f in anaf.values())
print('forma_juridica:', forms.most_common(12))
org = collections.Counter(f['date_generale']['forma_organizare'] for f in anaf.values())
print('forma_organizare:', org.most_common())

for grp in ('top', 'random', 'disjoint'):
    cs = [c for c in a['groups'][grp] if c in anaf]
    best = collections.Counter(); rowshare = collections.Counter(); ronshare = 0.0; tot = 0.0
    for c in cs:
        an = anaf[c]['date_generale']['denumire']
        ms = {n: match(n, an) for n in names0[c]}
        order = ['exact', 'contained', 'similar', 'overlap', 'different']
        b = min(ms.values(), key=order.index)
        best[b] += 1
        for n, k in ms.items():
            rowshare[k] += names0[c][n]
    tr = sum(rowshare.values())
    print(f'\n[{grp}] {len(cs)} CUIs. Best SEAP spelling vs ANAF name:', dict(best))
    print('   share of rows whose SEAP spelling matches ANAF:', {k: f'{100*v/tr:.1f}%' for k, v in rowshare.items()})

print('\n[top/random] CUIs where no SEAP spelling resembles the ANAF name:')
for c in a['groups']['top'] + a['groups']['random']:
    if c not in anaf: continue
    an = anaf[c]['date_generale']['denumire']
    if all(match(n, an) in ('different', 'overlap') for n in names0[c]):
        print('  ', c, 'ANAF:', an, '| SEAP:', [n for n, _ in names0[c].most_common(3)], f'{cui_ron[c]/1e6:.1f} M RON', anaf[c]['date_generale']['stare_inregistrare'])

print('\n[disjoint] per CUI: ANAF name and the SEAP spellings that do not resemble it')
dis_rows = dis_tot = 0; dis_ron_rows = 0
for c in a['groups']['disjoint']:
    if c not in anaf: continue
    an = anaf[c]['date_generale']['denumire']
    bad = [(n, k) for n, k in ((n, match(n, an)) for n in names0[c]) if k in ('different',)]
    br = sum(names0[c][n] for n, _ in bad); dis_rows += br; dis_tot += sum(names0[c].values())
    print('  ', c, f'{cui_ron[c]/1e6:.0f}M', 'ANAF:', an, '| unlike:', [(n, names0[c][n]) for n, _ in bad][:4])
print('rows with a spelling unlike ANAF in disjoint group:', dis_rows, 'of', dis_tot)

print('\n[multi] same SEAP name, several CUIs: ANAF names')
for n, cs in sorted(d['distinctive'].items(), key=lambda x: -sum(cui_ron[c] for c in x[1]))[:50]:
    print('  ', n, '->', [(c, anaf[c]['date_generale']['denumire'] if c in anaf else None, cui_rows[c]) for c in cs])
