"""Print header and first rows of each sample file (CSV or XLSX)."""
import csv, sys, os, itertools
csv.field_size_limit(10**9)
def rows(path):
    if path.endswith('.csv'):
        f = open(path, encoding='utf-8-sig', newline='')
        first = f.read(1); f.seek(0)
        if f.read(1) == '﻿': pass
        f.seek(0)
        q = '|' if first == '|' else '"'
        yield from csv.reader(f, quotechar=q)
    else:
        from python_calamine import CalamineWorkbook
        wb = CalamineWorkbook.from_path(path)
        print('  sheets:', wb.sheet_names)
        yield from wb.get_sheet_by_index(0).iter_rows()
for p in sys.argv[1:]:
    print('==', os.path.basename(p))
    for r in itertools.islice(rows(p), 4):
        print('  ', r)
