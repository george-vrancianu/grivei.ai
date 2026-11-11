"""Query ANAF PlatitorTvaRest v9 for a sample of supplier CUIs.

Usage: python -I anaf_sample.py <cui_names.pkl> <out.json>
Respects doc_WS_V9 limits: <=100 CUIs per request, <=1 request per second (we wait 3 s).
"""
import json, pickle, random, sys, time, urllib.request, datetime

d = pickle.load(open(sys.argv[1], 'rb'))
cui_ron = d['cui_ron']
random.seed(21)
top = [c for c, _ in cui_ron.most_common(100)]
rnd = random.sample(sorted(cui_ron), 200)
disj = [c for c, _ in sorted(d['disjoint'], key=lambda x: -cui_ron[x[0]])[:100]]
multi = []
for n, cs in sorted(d['distinctive'].items(), key=lambda x: -sum(cui_ron[c] for c in x[1]))[:50]:
    multi += cs
sel = list(dict.fromkeys(top + rnd + disj + multi))
groups = {'top': top, 'random': rnd, 'disjoint': disj, 'multi': multi}
print('selected', len(sel), {k: len(v) for k, v in groups.items()})
today = datetime.date.today().isoformat()
found, notfound = [], []
for i in range(0, len(sel), 100):
    body = json.dumps([{'cui': int(c), 'data': today} for c in sel[i:i + 100]]).encode()
    req = urllib.request.Request('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', data=body,
                                 headers={'Content-Type': 'application/json', 'User-Agent': 'research-script'})
    for attempt in range(3):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=60))
            break
        except Exception as e:
            print('error', e); time.sleep(10)
    print(i, r.get('cod'), r.get('message'), len(r.get('found', [])), len(r.get('notFound', [])), flush=True)
    found += r.get('found', []); notfound += r.get('notFound', [])
    time.sleep(3)
json.dump(dict(groups=groups, found=found, notFound=notfound, date=today), open(sys.argv[2], 'w'), ensure_ascii=False)
