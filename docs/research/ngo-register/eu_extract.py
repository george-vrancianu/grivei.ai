"""Extract (programme, role, beneficiary name as written, implementation county, eligible value) from the SMIS 2014-2020 lists.
POCU leader/partner cells with in-text CUIs are parsed like org-name-matching/pocu_extract.py. argv: out.tsv xlsx..."""
import sys, re, openpyxl
out = open(sys.argv[1], "w")
LEAD = re.compile(r"^\s*L\s*:\s*(.*?)\s*CUI\s*:?\s*(?:RO)?\s*(\d{2,10})\b", re.S)
PART = re.compile(r"(?:^|[\s;,-])(\d{4,10})\s*-\s*([^;]+?)(?=(?:\d{4,10}\s*-)|;|$)", re.S)
cl = lambda s: " ".join(str(s or "").replace("_x000D_", " ").split())
for f in sys.argv[2:]:
    prog = f.rsplit("/", 1)[-1].split("-")[0].split(".")[0].upper()
    wb = openpyxl.load_workbook(f, read_only=True)
    n = 0
    for ws in wb.worksheets:
        rows = ws.iter_rows(values_only=True)
        hdr = None
        for r in rows:
            if r and any(isinstance(c, str) and re.match(r"\s*(Denumire|Nume) beneficiar", c) for c in r):
                hdr = [cl(c) for c in r]; break
        if not hdr: continue
        ib = next(i for i, c in enumerate(hdr) if re.match(r"(Denumire|Nume) beneficiar", c))
        ip = next((i for i, c in enumerate(hdr) if c.startswith("Denumire parteneri")), None)
        ij = next((i for i, c in enumerate(hdr) if c.startswith("Jude")), None)
        iv = next((i for i, c in enumerate(hdr) if c.upper().startswith("VALOAREA ELIGIB") or c.lower().startswith("valoare totala eligibila")), None)
        for r in rows:
            if len(r) <= ib or not r[ib]: continue
            cell = str(r[ib]); jud = cl(r[ij]) if ij is not None and ij < len(r) else ""
            val = r[iv] if iv is not None and iv < len(r) and isinstance(r[iv], (int, float)) else 0
            if prog == "POCU" and "L:" in cell:
                m = LEAD.search(cell)
                if m: out.write(f"{prog}\tL\t{cl(m.group(1))}\t{int(m.group(2))}\t{jud}\t{val}\n"); n += 1
                tail = cell.split("PARTENERI", 1)[1] if "PARTENERI" in cell else ""
                tail = re.sub(r"^\s*:?\s*-?\s*", "", tail)
                for pm in PART.finditer(tail):
                    out.write(f"{prog}\tP\t{cl(pm.group(2))}\t{int(pm.group(1))}\t\t0\n"); n += 1
                continue
            out.write(f"{prog}\tL\t{cl(cell)}\t\t{jud}\t{val}\n"); n += 1
            if ip is not None and ip < len(r) and r[ip]:
                for part in re.split(r"[;\n]+", str(r[ip])):
                    part = re.sub(r"^\s*(P\d*\s*[:.-]|\d+\s*[.)-])\s*", "", part)
                    if cl(part): out.write(f"{prog}\tP\t{cl(part)}\t\t\t0\n"); n += 1
    print(prog, n, file=sys.stderr)
