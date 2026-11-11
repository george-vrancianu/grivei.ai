"""Extract supplier-relevant columns from the sampled SEAP bulk files into one TSV.

Usage: python -I extract.py <data_dir> <out.tsv>
Output columns: file, kind, rec_id, contract_no, lot, value_ron, supplier_name, cui_raw, cui_cell, country, auth_cui
cui_cell is 'str' when the cell was text, 'num' when XLSX stored it as a number (formatting lost).
"""
import csv, sys, os, datetime
csv.field_size_limit(10**9)

# (file stem) -> column indices: id, contract_no, lot, value, name, cui, country
C = dict
MAP = {
    '2021_DA':  C(id=8, cno=None, lot=None, val=17, name=0, cui=1, country=2, auth=7),
    '2021_CON': C(id=12, cno=20, lot=None, val=23, name=0, cui=1, country=2, auth=9),
    '2022_DA':  C(id=0, cno=None, lot=None, val=10, name=11, cui=12, country=None, state=2, auth=4),
    '2022_CON': C(id=9, cno=12, lot=11, val=16, name=17, cui=18, country=None, auth=1),
    '2023_DA':  C(id=0, cno=None, lot=None, val=10, name=11, cui=12, country=None, state=2, auth=4),
    '2023_DAN': C(id=2, cno=None, lot=None, val=9, name=13, cui=14, country=None, auth=1),
    '2023_CON': C(id=17, cno=20, lot=16, val=22, name=23, cui=24, country=26, auth=1),
    '2023_FARA': C(id=6, cno=15, lot=None, val=17, name=18, cui=19, country=21, auth=1),
    '2024_DA':  C(id=0, cno=None, lot=None, val=10, name=11, cui=12, country=None, state=2, auth=4),
    '2024_DAN': C(id=2, cno=None, lot=None, val=9, name=13, cui=14, country=None, auth=1),
    '2024_CON': C(id=17, cno=20, lot=16, val=22, name=23, cui=24, country=26, auth=1),
    '2024_FARA': C(id=6, cno=15, lot=None, val=17, name=18, cui=19, country=None, auth=1),
    '2025_DA':  C(id=2, cno=None, lot=None, val=11, name=12, cui=13, country=None, auth=1),
    '2025_DAN': C(id=2, cno=None, lot=None, val=8, name=12, cui=13, country=None, auth=1),
    '2025_CON': C(id=13, cno=16, lot=12, val=18, name=19, cui=20, country=None, auth=1),
    '2025_FARA': C(id=4, cno=13, lot=None, val=15, name=16, cui=17, country=None, auth=1),
    '2026_DA':  C(id=2, cno=None, lot=None, val=11, name=12, cui=13, country=None, auth=1),
    '2026_DAN': C(id=2, cno=None, lot=None, val=8, name=12, cui=13, country=None, auth=1),
    '2026_CON': C(id=13, cno=16, lot=12, val=18, name=19, cui=20, country=None, auth=1),
    '2026_FARA': C(id=4, cno=13, lot=None, val=15, name=16, cui=17, country=None, auth=1),
}

def csv_encoding(path):
    try:
        with open(path, encoding='utf-8-sig') as f:
            for _ in f:
                pass
        return 'utf-8-sig'
    except UnicodeDecodeError:
        return 'cp1250'

def csv_rows(path):
    enc = csv_encoding(path)
    print('  encoding', path, enc, flush=True)
    f = open(path, encoding=enc, newline='')
    q = '|' if f.read(1) == '|' else '"'
    f.seek(0)
    if f.read(1) == '\ufeff':
        pass
    f.seek(0)
    for r in csv.reader(f, quotechar=q):
        yield [(c, 'str') for c in r]

def xlsx_rows(path):
    from python_calamine import CalamineWorkbook
    wb = CalamineWorkbook.from_path(path)
    for r in wb.get_sheet_by_index(0).iter_rows():
        out = []
        for c in r:
            if isinstance(c, float):
                out.append((str(int(c)) if c == int(c) else repr(c), 'num'))
            elif isinstance(c, int):
                out.append((str(c), 'num'))
            elif isinstance(c, (datetime.date, datetime.datetime)):
                out.append((c.isoformat(), 'date'))
            else:
                out.append((str(c), 'str'))
        yield out

def parse_value(s):
    s = s.strip().replace(' ', '')
    if not s:
        return ''
    s = s.replace(',', '')  # CSV exports use ',' as thousands separator
    try:
        return repr(float(s))
    except ValueError:
        return 'BAD:' + s

def main(data, out):
    w = open(out, 'w', encoding='utf-8')
    for stem, m in MAP.items():
        kind = stem.split('_')[1]
        fn = [f for f in os.listdir(data) if f.startswith(stem + '.')][0]
        path = os.path.join(data, fn)
        gen = csv_rows(path) if fn.endswith('.csv') else xlsx_rows(path)
        n = 0; skipped = 0
        width = max(v for k, v in m.items() if v is not None)
        for i, r in enumerate(gen):
            if i == 0:
                continue
            if len(r) <= width:
                skipped += 1
                if skipped <= 3: print('  short row', len(r), r[:3], flush=True)
                continue
            rid = r[m['id']][0].strip()
            # skip repeated header rows (technical header in 2025 CON, stray headers)
            if not rid or rid.upper().startswith(('NUMAR', 'DATA_', 'NUMĂR')):
                skipped += 1
                continue
            if 'state' in m and r[m['state']][0].strip() != 'Oferta acceptata':
                skipped += 1
                continue
            val = r[m['val']]
            val = val[0] if val[1] == 'num' else parse_value(val[0])
            name = r[m['name']][0].replace('\t', ' ').replace('\n', ' ')
            cui, cell = r[m['cui']]
            cui = cui.replace('\t', '<TAB>').replace('\n', '<LF>').replace('\r', '<CR>')
            country = r[m['country']][0].strip() if m['country'] is not None else ''
            cno = r[m['cno']][0].strip() if m['cno'] is not None else ''
            lot = r[m['lot']][0].strip() if m['lot'] is not None else ''
            auth = r[m['auth']][0].strip()
            w.write('\t'.join(x.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ') for x in [stem, kind, rid, cno, lot, val, name, cui, cell, country, auth]) + '\n')
            n += 1
        print(stem, 'rows', n, 'skipped', skipped, flush=True)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
