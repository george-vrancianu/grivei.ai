"""POST the 'Biografie' postback for one senat.ro profile and print visible text around birth words. args: profile_url out_html"""
import sys, re, urllib.request, urllib.parse, http.cookiejar
url = sys.argv[1]
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
op.addheaders = [("User-Agent", "Mozilla/5.0")]
t = op.open(url, timeout=60).read().decode("utf-8", "replace")
fields = dict(re.findall(r'<input type="hidden" name="([^"]+)" id="[^"]*" value="([^"]*)"', t))
fields["__EVENTTARGET"] = "ctl00$B_Center$Repeater14$ctl00$lnkBiog"; fields["__EVENTARGUMENT"] = ""
r = op.open(url, data=urllib.parse.urlencode(fields).encode(), timeout=60).read().decode("utf-8", "replace")
open(sys.argv[2], "w").write(r)
txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<!--.*?-->", " ", r, flags=re.S)))
for m in re.finditer(r"(n[aă]scut|na[sşș]terii|\b(19[3-9]\d)\b)", txt, re.I): print("...", txt[max(0, m.start()-150): m.end()+150])
print(len(r), "bytes; pdf links:", re.findall(r'href="([^"]+\.pdf)"', r, re.I)[:5])
