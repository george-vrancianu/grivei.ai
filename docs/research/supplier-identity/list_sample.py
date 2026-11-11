"""Select sample resources (DA, DAN, Contracte, fara anunt) from the CKAN package JSONs."""
import json, sys, re
DATA = sys.argv[1]
# (year, regex on resource name identifying the quarter, preferred format)
PICK = [(2021, r'2021 - T3', 'csv'), (2022, r'2022 - T1', 'csv'), (2023, r'T IV 2023', 'csv'),
        (2024, r'T II 2024', 'csv'), (2025, r'T IV 2025', 'xlsx'), (2026, r'TIII 2026', 'xlsx')]
KINDS = [('DA', r'(?i)achizi\S* directe'), ('DAN', r'(?i)notific'), ('CON', r'(?i)^(raport )?contracte'),
         ('FARA', r'(?i)f\S*r\S* anun\S* de ini')]
for y, q, fmt in PICK:
    res = json.load(open(f'{DATA}/pkg-{y}.json'))['result']['resources']
    for kind, kre in KINDS:
        c = [r for r in res if re.search(q, r['name']) and re.search(kre, r['name'].strip()) and r['url']]
        if fmt == 'csv':
            c2 = [r for r in c if r['url'].lower().endswith('.csv')] or c
        else:
            c2 = c
        for r in c2[:1]:
            ext = r['url'].rsplit('.', 1)[-1].lower()
            print(f"{y}\t{kind}\t{ext}\t{r['url']}")
