"""Parse senat.ro profiles: name, party, and the birth date/place found in an HTML comment. args: profile_dir out_csv"""
import sys, re, pathlib, csv, html
rows = []
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.html")):
    t = f.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"<!--\s*Data na\S+?terii:\s*([^<\r\n]*?)\s*(?:<br\s*/?>)?\s*Locul na\S+?terii:\s*([^<>]*?)\s*-->", t, re.S)
    m2 = re.search(r"Data na\S+terii:\s*([0-9./ -]*)", t)
    title = re.search(r"<title>(.*?)</title>", t, re.S)
    name = re.search(r"section-title\">\s*<h2>\s*([^<]+)", t)
    shown = bool(re.search(r"Data na\S+terii", re.sub(r"<!--.*?-->", "", t, flags=re.S)))
    bd = (m.group(1) if m else (m2.group(1) if m2 else "")).strip()
    rows.append(dict(id=f.stem, name=html.unescape(name.group(1)).strip() if name else "", title=html.unescape(title.group(1)).strip() if title else "",
                     birth_date=bd, birth_place=(m.group(2).strip() if m else ""), full=bool(re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", bd)), shown_outside_comment=shown))
w = csv.DictWriter(open(sys.argv[2], "w", newline=""), fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), "profiles;", sum(r["full"] for r in rows), "full dd.mm.yyyy;", sum(bool(r["birth_date"]) for r in rows), "any date;", sum(r["shown_outside_comment"] for r in rows), "show it outside a comment")
