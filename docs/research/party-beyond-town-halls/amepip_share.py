"""Value awarded by SEAP authorities that AMEPIP lists as public enterprises, split national vs local by a name rule (estimate only).
args: amepip.xlsx authority_totals.csv lista_ep_2026.xls"""
import sys; sys.path.insert(0, "/tmp/pb-lib")  # xlrd/openpyxl installed with `uv pip install --target /tmp/pb-lib`
import openpyxl, csv, re, unicodedata
fold = lambda s: re.sub(r"[^A-Z0-9 ]", " ", unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper())
ws = openpyxl.load_workbook(sys.argv[1], read_only=True).worksheets[0]
amep = {}
for i, r in enumerate(ws.iter_rows(values_only=True)):
    if i and r[1]: amep[str(r[1]).strip()] = r[2]
NAT = re.compile(r"\b(NATIONAL|NATIONALA|ROMANIA|ROMAN|ROMANA|ROMATSA|ROMSILVA|HIDROELECTRICA|NUCLEARELECTRICA|TRANSELECTRICA|TRANSGAZ|ROMGAZ|CFR|METROREX|POSTA|ELECTRICA|OLTENIA|TERMOCENTRALE|CONPET|DEPOGAZ|AEROPORTURI BUCURESTI|ADMINISTRATIA PORTURILOR|CANALELOR NAVIGABILE)\b")
T = loc = nat = 0; nloc = nnat = 0; tops = []
for r in csv.DictReader(open(sys.argv[2], encoding="utf-8")):
    v = int(r["awarded"] or 0); T += v; c = (r["cui"] or r["entity_key"]).lstrip("0")
    if c in amep:
        if NAT.search(fold(amep[c])): nat += v; nnat += 1
        else: loc += v; nloc += 1; tops.append((v, amep[c]))
print(f"AMEPIP public enterprises buying in SEAP: national-looking {nnat} ({nat/T:.1%}), local-looking {nloc} ({loc/T:.1%}) of {T/1e11:.0f} bn")
for v, n in sorted(tops, reverse=True)[:25]: print(f"  {v/1e11:6.2f} {n}")
