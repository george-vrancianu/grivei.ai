"""Extract MF taxpayer-identification rows that look like non-profit legal persons. argv: out.tsv files..."""
import sys, re, collections
NGO = re.compile(r"\b(ASOCIA[TŢȚ]IA|FUNDA[TŢȚ]IA|FEDERA[TŢȚ]IA|UNIUNEA|ASOCIA[TŢȚ]IE|FUNDA[TŢȚ]IE)\b", re.I)
out = open(sys.argv[1], "w")
tip = collections.Counter(); tipu = collections.Counter(); ngotip = collections.Counter(); act = collections.Counter(); stare = collections.Counter()
n = ng = 0
for f in sys.argv[2:]:
    with open(f, encoding="utf-8-sig", errors="replace") as fh:
        h = fh.readline().rstrip("\r\n").split("^")
        ix = {k: i for i, k in enumerate(h)}
        for line in fh:
            p = line.rstrip("\r\n").split("^")
            if len(p) < len(h) - 2: continue
            n += 1
            g = lambda k: p[ix[k]].strip() if ix[k] < len(p) else ""
            tip[g("TIP_CONTRIB")] += 1; tipu[g("TIP_UNITATE")] += 1
            nm = g("DENUMIRE")
            if NGO.search(nm):
                ng += 1; ngotip[(g("TIP_CONTRIB"), g("TIP_UNITATE"))] += 1; stare[g("STARE")] += 1
                a = g("ACT_AUTORIZARE"); act[re.sub(r"\d+", "9", a)[:30]] += 1
                out.write("\t".join([g("COD_FISCAL"), nm, g("COD_FISCAL_PARINTE"), g("TIP_UNITATE"), g("TIP_CONTRIB"), g("JUDET"), g("LOCALITATE"),
                                     g("DATA_INREGISTRARE"), g("DATA_RADIERE"), g("STARE"), a[:80], g("JUDET_COMERT"), g("NR_COMERT")]) + "\n")
print("rows", n, "ngo-named", ng)
print("TIP_CONTRIB", tip.most_common(15)); print("TIP_UNITATE", tipu.most_common(10))
print("ngo by tip", ngotip.most_common(10)); print("ngo STARE", stare.most_common(10)); print("ngo ACT shapes", act.most_common(25))
