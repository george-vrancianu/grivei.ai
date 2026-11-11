#!/usr/bin/env python3
"""
Exportă un sub-graf curat din Postgres în formatul JSON IR al Archify
(diagram_type "architecture") — pentru "diagrame de caz": ≤ ~15 entități, aranjate
pe grilă, cu grupuri (boundaries) pentru asocieri și legături etichetate cu bani.

  python tools/export_archify.py --authority "MUNICIPIUL BRASOV" \
      --firms COMPREST "RS ACTIV" RECON FINCODRUM MIRACONS "EURO STRADA" "STRACO HOLDING" \
      --out diagrams/brasov-bloc.architecture.json
  # sau automat, primele N după bani:
  python tools/export_archify.py --authority "MUNICIPIUL BRASOV" --top 10 --out diagrams/brasov-top10.architecture.json

Apoi, pe mașina cu Archify instalat:
  node archify/bin/archify.mjs finalize architecture diagrams/brasov-bloc.architecture.json

Nu are dependențe Python; folosește `psql`.
"""
import argparse, json, os, re, subprocess, sys
from collections import defaultdict

DB = os.environ.get("DATABASE_URL", "postgresql://watchdog:watchdog@localhost/watchdog")
SQL_ENTITIES = """
SELECT e.id, e.canonical_name, coalesce(e.cui,''), coalesce(e.attrs->>'county',''), e.kind::text
  FROM entity e WHERE e.canonical_name = ANY(%s)"""
SQL_TOP = """
SELECT supplier_id FROM v_supplier_totals WHERE authority = %s ORDER BY ron_total_share DESC LIMIT %d"""
SQL_AWARDS = """
SELECT e.dst_id,
       count(*),
       sum(e.amount_ron / greatest((e.attrs->>'n_winners')::int, 1))::bigint,
       count(*) FILTER (WHERE e.attrs->>'procedure' ILIKE '%%fara publicare%%'),
       coalesce(sum(e.amount_ron) FILTER (WHERE e.attrs->>'procedure' ILIKE '%%fara publicare%%'), 0)::bigint,
       count(*) FILTER (WHERE e.relation = 'DIRECT_PURCHASE'),
       coalesce(sum(e.amount_ron) FILTER (WHERE e.relation = 'DIRECT_PURCHASE'), 0)::bigint
  FROM edge e WHERE e.src_id = %d AND e.dst_id = ANY(%s) AND e.relation IN ('AWARDED_CONTRACT','DIRECT_PURCHASE')
 GROUP BY e.dst_id"""
SQL_CONSORTIA = """
SELECT src_id, dst_id, count(*) FROM edge WHERE relation = 'CONSORTIUM_WITH' AND src_id = ANY(%s) AND dst_id = ANY(%s)
 GROUP BY 1, 2"""


def q(sql):
    r = subprocess.run(["psql", DB, "-At", "-F", "\t", "-c", sql], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return [line.split("\t") for line in r.stdout.splitlines() if line]


def arr(ids):
    return "ARRAY[" + ",".join(str(int(i)) for i in ids) + "]::bigint[]"


def strarr(names):
    return "ARRAY[" + ",".join("'" + n.replace("'", "''") + "'" for n in names) + "]"


def mil(ron):
    return f"{int(ron)/1e6:.1f} mil."


def slug(name, used):
    s = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:24] or "n"
    s = re.sub(r"^[^a-z]", "n", s)
    base, k = s, 2
    while s in used:
        s = f"{base}_{k}"; k += 1
    used.add(s)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--authority", required=True)
    ap.add_argument("--firms", nargs="*", default=[])
    ap.add_argument("--top", type=int, default=0)
    ap.add_argument("--title", default=None)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    auth = q(SQL_ENTITIES % strarr([a.authority]))
    if not auth:
        sys.exit("autoritatea nu există în entity")
    auth_id = int(auth[0][0])

    firm_ids = []
    if a.top:
        firm_ids += [int(r[0]) for r in q(SQL_TOP % ("'" + a.authority.replace("'", "''") + "'", a.top))]
    if a.firms:
        firm_ids += [int(r[0]) for r in q(SQL_ENTITIES % strarr(a.firms))]
    firm_ids = list(dict.fromkeys(firm_ids))
    if not firm_ids:
        sys.exit("nicio firmă selectată (--firms sau --top)")

    ents = {int(r[0]): r for r in q(f"SELECT id, canonical_name, coalesce(cui,''), coalesce(attrs->>'county',''), kind FROM entity WHERE id = ANY({arr(firm_ids)})")}
    awards = {int(r[0]): r for r in q(SQL_AWARDS % (auth_id, arr(firm_ids)))}
    cons = q(SQL_CONSORTIA % (arr(firm_ids), arr(firm_ids)))

    # clustere = componente conexe pe CONSORTIUM_WITH (așa devin boundaries compacte)
    parent = {i: i for i in firm_ids}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for s, d, _ in cons:
        parent[find(int(s))] = find(int(d))
    clusters = defaultdict(list)
    for i in firm_ids:
        clusters[find(i)].append(i)
    ordered = sorted(clusters.values(), key=lambda c: -sum(int(awards.get(i, [0, 0, 0])[2] or 0) for i in c))

    used, ids = set(), {}
    components, boundaries, connections = [], [], []
    auth_sid = slug(a.authority, used); ids[auth_id] = auth_sid
    components.append({"id": auth_sid, "type": "security", "label": a.authority.title(),
                       "sublabel": f"CUI {auth[0][2]} · autoritate contractantă", "row": 0, "col": 2})

    row = 1
    for cl in ordered:
        cl.sort(key=lambda i: -int(awards.get(i, [0, 0, 0])[2] or 0))
        for k, i in enumerate(cl):
            r = row + k // 6
            c = k % 6
            e = ents[i]; aw = awards.get(i)
            sid = slug(e[1], used); ids[i] = sid
            local = e[3].lower().startswith("bra")
            sub = f"CUI {e[2]}" + (f" · {e[3]}" if e[3] else "")
            if aw and int(aw[3]):
                sub += f" · {aw[3]} negocieri fără publicare"
            components.append({"id": sid, "type": "backend" if local else "external",
                               "label": e[1].title() if e[1].isupper() else e[1], "sublabel": sub, "row": r, "col": c})
        if len(cl) > 1:
            boundaries.append({"kind": "security-group", "label": f"asociere: {len(cl)} firme care câștigă împreună",
                               "wraps": [ids[i] for i in cl], "pad": 14})
        row += (len(cl) + 5) // 6  # rândul următor

    for i in firm_ids:
        aw = awards.get(i)
        if not aw:
            continue
        n, share, neg_n, neg_ron, da_n, da_ron = int(aw[1]), int(aw[2] or 0), int(aw[3]), int(aw[4]), int(aw[5]), int(aw[6])
        label = f"{n} contracte · {mil(share)} RON"
        if da_n:
            label = f"{n - da_n} contracte + {da_n} DA · {mil(share)} RON"
        conn = {"id": f"c_{ids[i]}", "from": auth_sid, "to": ids[i], "label": label, "variant": "emphasis"}
        if neg_n:
            conn["variant"] = "security"
            conn["label"] = f"{label} · {neg_n} neg. fără publicare ({mil(neg_ron)})"
        connections.append(conn)
    seen = set()
    for s, d, n in cons:
        s, d = int(s), int(d)
        key = tuple(sorted((s, d)))
        if key in seen:
            continue
        seen.add(key)
        connections.append({"id": f"k_{ids[s]}_{ids[d]}", "from": ids[s], "to": ids[d],
                            "label": f"{n}× împreună", "variant": "dashed"})

    doc = {
        "schema_version": 1, "diagram_type": "architecture",
        "meta": {
            "title": a.title or f"{a.authority.title()} — rețeaua marilor furnizori",
            "output": re.sub(r"\.architecture\.json$", ".html", a.out),
            "visual_preset": "editorial", "quality_profile": "showcase", "locale": "en",
            "legend": {"mode": "auto", "entries": {
                "security": {"label": "autoritate contractantă / negociere fără publicare"},
                "backend": {"label": "firmă din județ"},
                "external": {"label": "firmă din alt județ"}}},
        },
        "components": components, "boundaries": boundaries, "connections": connections,
    }
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"scris {a.out}: {len(components)} componente, {len(boundaries)} grupuri, {len(connections)} legături")


if __name__ == "__main__":
    main()
