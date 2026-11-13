"""Match senators (name + birth date from senat.ro) to ONRC representatives. args: senators.csv od_reprezentanti_legali.csv od_reprezentanti_if.csv
Name key ignores word order, case, hyphens and diacritics (ADR 0011). Prints counts only, never names."""
import sys, csv, re, unicodedata, collections
csv.field_size_limit(10**7)
def key(n):
    s = unicodedata.normalize("NFKD", n or "").encode("ascii", "ignore").decode().upper()
    return " ".join(sorted(re.sub(r"[^A-Z ]", " ", s).split()))
def date(s):
    s = (s or "").strip().split(" ")[0]
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m: return f"{m[3]}.{m[2]}.{m[1]}"
    m = re.fullmatch(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", s)
    return f"{int(m[1]):02d}.{int(m[2]):02d}.{m[3]}" if m else ""
sen = [r for r in csv.DictReader(open(sys.argv[1]))]
want = {key(r["name"]) for r in sen}
by_name = collections.defaultdict(set); roles = collections.Counter(); sample_dates = []
for path, ncol in ((sys.argv[2], "PERSOANA_IMPUTERNICITA"), (sys.argv[3], "NUME")):
    with open(path, encoding="utf-8-sig", errors="replace") as f: head = f.readline()
    delim = "^" if head.count("^") > head.count(",") else ("|" if "|" in head else ",")
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as f:
        rd = csv.DictReader(f, delimiter=delim, quoting=csv.QUOTE_NONE)
        for r in rd:
            if len(sample_dates) < 3: sample_dates.append(r.get("DATA_NASTERE"))
            k = key(r.get(ncol))
            if k in want: by_name[k].add(date(r.get("DATA_NASTERE"))); roles[k] += 1
print("sample ONRC dates", sample_dates)
full = [r for r in sen if r["full"] == "True"]
namesake = [r for r in full if key(r["name"]) in by_name]
match = [r for r in namesake if r["birth_date"] in by_name[key(r["name"])]]
multi = [r for r in namesake if len(by_name[key(r["name"])] - {""}) >= 2]
print(f"senators {len(sen)}, full birth date {len(full)}, ONRC namesake {len(namesake)}, name+birth date match {len(match)}, namesakes with >=2 distinct ONRC birth dates {len(multi)}, name-only wrong links {len(namesake)-len(match)}")
# near misses among namesakes without an exact match: same year, or day/month swapped (a typo on either side would look like this)
near = 0
for r in namesake:
    if r in match: continue
    d, m, y = r["birth_date"].split(".")
    if any(x and (x.split(".")[2] == y and (x.split(".")[:2] == [m, d] or abs(int(x.split(".")[0]) - int(d)) <= 1 and x.split(".")[1] == m)) for x in by_name[key(r["name"])]): near += 1
print("non-matching namesakes with a near-identical ONRC date (swap or +-1 day):", near)
