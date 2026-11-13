"""Extract NGO register rows: kind, name, RN number, status, county, locality, address, public-utility HG. argv: out.tsv files..."""
import sys, openpyxl, collections
out = open(sys.argv[1], "w")
cl = lambda s: " ".join(str(s or "").replace("_x000D_", " ").split())
for f in sys.argv[2:]:
    kind = f.rsplit("/", 1)[-1]
    wb = openpyxl.load_workbook(f, read_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    h = [cl(c) for c in next(it)]
    print(kind, h, file=sys.stderr)
    ix = {k: h.index(k) for k in ["Denumire", "Numar inreg Reg National", "Starea actuala", "Judet", "Localitate", "Adresa", "HG utilitate publica"]}
    n = 0; st = collections.Counter()
    for r in it:
        g = lambda k: cl(r[ix[k]]) if ix[k] < len(r) else ""
        if not g("Denumire") and not g("Numar inreg Reg National"):
            continue
        n += 1; st[g("Starea actuala")] += 1
        out.write("\t".join([kind, g("Denumire"), g("Numar inreg Reg National"), g("Starea actuala"), g("Judet"), g("Localitate"), g("Adresa")[:200], g("HG utilitate publica")[:50]]) + "\n")
    print(kind, "rows", n, st.most_common(12), file=sys.stderr)
