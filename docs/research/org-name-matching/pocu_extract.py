"""PROTOTYPE (#136), throwaway. Extract (role, name as SMIS wrote it, CUI, single implementation county) from the POCU 2014-2020
list of contracted projects (data.gov.ro, cut-off 31.08.2025). Leader: 'L: <name> CUI <digits> ; PARTENERI:- <cui>-<name>...'.
argv: pocu.xlsx out.tsv"""
import sys, re, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
ws = wb.worksheets[0]
rows = ws.iter_rows(values_only=True, max_col=30)
hdr = None
for r in rows:
    if r and any(isinstance(c, str) and c.startswith("Denumire beneficiar") for c in r):
        hdr = r; break
ib = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith("Denumire beneficiar"))
ij = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith("Jude"))
ival = next(i for i, c in enumerate(hdr) if isinstance(c, str) and c.startswith("Valoarea ELIGIB"))
LEAD = re.compile(r"^\s*L\s*:\s*(.*?)\s*CUI\s*:?\s*(?:RO)?\s*(\d{2,10})\b", re.S)
PART = re.compile(r"(?:^|[\s;,-])(\d{4,10})\s*-\s*([^;]+?)(?=(?:\d{4,10}\s*-)|;|$)", re.S)
out = open(sys.argv[2], "w"); n = lead = part = 0
for r in rows:
    cell = r[ib] if len(r) > ib else None
    if not isinstance(cell, str) or "L:" not in cell:
        continue
    n += 1
    jud = (r[ij] or "") if isinstance(r[ij], str) else ""
    jud = " ".join(jud.split())
    single = jud if jud and not re.search(r"[/,;]", jud.rstrip(",")) else ""
    val = r[ival] if isinstance(r[ival], (int, float)) else 0
    m = LEAD.search(cell)
    if m:
        out.write(f"L\t{' '.join(m.group(1).split())}\t{int(m.group(2))}\t{single}\t{val}\n"); lead += 1
    tail = cell.split("PARTENERI", 1)[1] if "PARTENERI" in cell else ""
    tail = re.sub(r"^\s*:?\s*-?\s*", "", tail)
    for pm in PART.finditer(tail):
        out.write(f"P\t{' '.join(pm.group(2).split())}\t{int(pm.group(1))}\t\t0\n"); part += 1
print("projects", n, "leaders parsed", lead, "partners parsed", part, file=sys.stderr)
