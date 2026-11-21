"""`seap.search` written once (ticket #305): the `search-rows` Step.

The unit loop writes the search rows it computes into `seap.search_load` (same ids, one commit per unit); the entities step and the Signals read that table.
This Step runs after placement, aep and the Signals and writes `seap.search` in one INSERT ... SELECT, ordered by id, with the columns those steps
produce joined in, so no step rewrites the table afterwards (a rewrite leaves a dead version of every row: placement alone used to spend most of its time on that):

- `authority_county`, `authority_uat`, `authority_area`, `supplier_county`, `supplier_area` from `core.placement` (joined on the authority key and on the supplier key);
  a national authority has a NULL county and UAT and the area NATIONAL, an unplaced authority UNPLACED, a supplier with no county of its own UNKNOWN_SUPPLIER_COUNTY;
- `party`, `party_basis` from `aep.record_party` and `aep.mandate` (an Independent leader has a Mandate, so a basis, but no party);
- `signals`, `has_signals`, `restricted_signals` from `seap.signal_member` and `seap.signal` (a Restricted rule is never in `signals` or `has_signals`, ADR 0015);
- `badges`: the counting and identity badges the unit loop wrote, then the crawl badge from `seap.record.crawl_status` (the chips filter on them).

The ids are copied, then the identity continues after them; the supplier-key index the later steps use is built here, after the load, and the load table is dropped."""
import psycopg

from .analyze import analyze

# The search table's columns in the order of its DDL (sql/seap_schema.sql); `l` is the load row, `r` its Record, `pa` and `ps` the authority's and the supplier's
# placement, `p` and `m` its Party and Mandate, `g` its Signals.
_WRITE = """
INSERT INTO seap.search (id, record_code, winner_position, winners, channel, award_date, award_year, value_bani, value_bucket, has_signals, signals,
                         restricted_signals, badges, procedure, cpv_code, counted_bani, ceiling_bani, suspect, share_bani, authority_key, authority_cui,
                         authority_county, authority_uat, authority_area, supplier_area, supplier_cui, supplier_key, supplier_county, supplier_spelling,
                         supplier_vat, supplier_curated, supplier_differs, party, party_basis, doc)
OVERRIDING SYSTEM VALUE
SELECT l.id, l.record_code, l.winner_position, l.winners, l.channel, l.award_date, l.award_year, l.value_bani, l.value_bucket,
       g.rules IS NOT NULL, coalesce(g.rules, '{}'), coalesce(g.restricted, '{}'),
       l.badges || CASE WHEN r.crawl_status IS NULL THEN '{}'::text[] WHEN r.crawl_status = 'PROVISIONAL' THEN ARRAY['CRAWLED_PROVISIONAL'] ELSE ARRAY['CRAWL_ONLY'] END,
       l.procedure, l.cpv_code, l.counted_bani, l.ceiling_bani, l.suspect, l.share_bani, l.authority_key, l.authority_cui,
       CASE WHEN pa.national THEN NULL ELSE 'RO-' || pa.county_iso END,
       CASE WHEN pa.national THEN NULL ELSE pa.uat_siruta END,
       coalesce(CASE WHEN pa.national THEN 'NATIONAL' ELSE 'RO-' || pa.county_iso END, 'UNPLACED'),
       coalesce('RO-' || ps.county_iso, 'UNKNOWN_SUPPLIER_COUNTY'),
       l.supplier_cui, l.supplier_key, 'RO-' || ps.county_iso, l.supplier_spelling, l.supplier_vat, l.supplier_curated, l.supplier_differs,
       CASE WHEN m.independent THEN NULL ELSE m.list_name END,
       CASE WHEN p.record_code IS NULL THEN NULL WHEN p.via_key IS NULL THEN 'DIRECT' ELSE 'SUBORDINATE' END,
       l.doc
  FROM seap.search_load l
  JOIN seap.record r ON r.code = l.record_code
  LEFT JOIN core.placement pa ON pa.entity_key = l.authority_key AND (pa.national OR pa.county_iso IS NOT NULL)
  LEFT JOIN core.placement ps ON ps.entity_key = l.supplier_key AND NOT ps.national AND ps.county_iso IS NOT NULL
  LEFT JOIN aep.record_party p ON p.record_code = l.record_code
  LEFT JOIN aep.mandate m ON m.id = p.mandate_id
  LEFT JOIN (SELECT sm.record_code,
                    array_agg(DISTINCT s.rule ORDER BY s.rule) FILTER (WHERE s.rule <> ALL(%(restricted)s::text[])) AS rules,
                    array_agg(DISTINCT s.rule ORDER BY s.rule) FILTER (WHERE s.rule = ANY(%(restricted)s::text[])) AS restricted
               FROM seap.signal_member sm JOIN seap.signal s ON s.id = sm.signal_id GROUP BY sm.record_code) g ON g.record_code = l.record_code
 ORDER BY l.id
"""


def write_search(cur: psycopg.Cursor, restricted_slugs: list[str]) -> None:
    """Write `seap.search` from `seap.search_load` and drop the load table (the caller's transaction). `restricted_slugs`: the Restricted rules (signals.restricted_slugs)."""
    cur.execute("DROP INDEX seap.search_award_date_idx")  # built after the rows are in: one pass, like the supplier-key index
    cur.execute(_WRITE, {"restricted": restricted_slugs})
    cur.execute("SELECT setval(pg_get_serial_sequence('seap.search', 'id'), coalesce(max(id), 0) + 1, false) FROM seap.search")  # the identity continues after the copied ids
    cur.execute("CREATE INDEX search_award_date_idx ON seap.search (award_date)")
    cur.execute("CREATE INDEX search_supplier_key_idx ON seap.search (supplier_key)")  # the entity(key) roles look a search row up by supplier
    cur.execute("DROP TABLE seap.search_load")
    analyze(cur, "seap.search")  # the rollup groups by the county and has_signals columns just joined in
