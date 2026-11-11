#!/usr/bin/env python3
"""
Exports the graph (entities + edges aggregated per pair) as JSON for the interactive viewer
(viewer/graph.html). Run it after loading at least one batch.

  python tools/export_graph.py --authority "MUNICIPIUL TIMISOARA" --out viewer/timisoara.graph.json
  (without --authority it exports the whole graph)
"""
import argparse, json, os, subprocess, sys

DB = os.environ.get("DATABASE_URL", "postgresql://watchdog:watchdog@localhost/watchdog")

SQL = r"""
WITH auth AS (SELECT id, canonical_name FROM entity WHERE canonical_name = %(auth)s OR %(auth)s = ''),
scope AS (  -- the entities around the authority: itself + everything directly linked to it
  SELECT id FROM auth UNION SELECT dst_id FROM edge WHERE src_id IN (SELECT id FROM auth) UNION SELECT src_id FROM edge WHERE dst_id IN (SELECT id FROM auth)
),
agg AS (
  SELECT e.src_id, e.dst_id, e.relation, count(*) AS n,
         coalesce(sum(e.amount_ron),0) AS ron,
         min(e.valid_from) AS first_seen, max(e.valid_from) AS last_seen,
         count(*) FILTER (WHERE e.attrs->>'procedure' ILIKE '%fara publicare%') AS n_neg,
         (array_agg(DISTINCT d.url) FILTER (WHERE d.url IS NOT NULL))[1:5] AS urls
    FROM edge e JOIN document d ON d.id = e.document_id
   WHERE %(auth)s = '' OR (e.src_id IN (SELECT id FROM scope) AND e.dst_id IN (SELECT id FROM scope))
   GROUP BY 1,2,3
), used AS (SELECT src_id AS id FROM agg UNION SELECT dst_id FROM agg)
SELECT json_build_object(
  'generated_at', now(),
  'authority', (SELECT canonical_name FROM auth LIMIT 1),
  'home_county', %(county)s,
  'period', (SELECT min(first_seen)::text || ' → ' || max(last_seen)::text FROM agg),
  'nodes', (SELECT json_agg(json_build_object(
              'id', x.id, 'name', x.canonical_name, 'kind', x.kind, 'cui', x.cui,
              'county', x.attrs->>'county', 'city', x.attrs->>'city', 'sme', (x.attrs->>'is_sme')::boolean,
              'in_ron', coalesce((SELECT sum(ron) FROM agg WHERE dst_id = x.id AND relation IN ('AWARDED_CONTRACT','DIRECT_PURCHASE')),0),
              'n_in', coalesce((SELECT sum(n) FROM agg WHERE dst_id = x.id AND relation IN ('AWARDED_CONTRACT','DIRECT_PURCHASE')),0),
              'n_neg', coalesce((SELECT sum(n_neg) FROM agg WHERE dst_id = x.id),0),
              'aliases', (SELECT json_agg(DISTINCT alias) FROM entity_alias al WHERE al.entity_id = x.id)
            ) ORDER BY x.id)
            FROM entity x WHERE x.id IN (SELECT id FROM used)),
  'edges', (SELECT json_agg(json_build_object(
              'source', src_id, 'target', dst_id, 'rel', relation, 'n', n, 'ron', ron,
              'first', first_seen, 'last', last_seen, 'n_neg', n_neg, 'urls', urls))
            FROM agg)
)::text;
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--authority", default="")
    ap.add_argument("--county", default="", help="the authority's county (colors local companies); empty = inferred from the data")
    a = ap.parse_args()
    sql = SQL.replace("%(auth)s", "'" + a.authority.replace("'", "''") + "'").replace("%(county)s", "NULLIF('" + a.county.replace("'", "''") + "','')")
    r = subprocess.run(["psql", DB, "-At", "-c", sql], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    data = json.loads(r.stdout)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"{a.out}: {len(data['nodes'])} nodes, {len(data['edges'])} aggregated edges")


if __name__ == "__main__":
    main()
