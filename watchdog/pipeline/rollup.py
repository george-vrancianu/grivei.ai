"""The rollup behind the empty and chips-only search states (#70), rebuilt inside the load transaction.

`build_rollup(cur)` fills, from `seap.search`: `rollup_cube` (year x channel x value bucket x has-Signals x authority county x
supplier county), `rollup_entity` (per authority and per supplier, by the same chip dimensions), `rollup_prefix` (the 2-character
prefixes present in the load: the API's cache warms them) and `rollup_meta` (a fresh generation per load: the API flushes its
result cache when it changes). Because it runs in the load's transaction, a reader sees the rollup of the load it sees.

What the cube can serve: whole-year ranges, channel, value bucket, has-Signals. Badges, procedure, partial-year dates, text, CPV,
county and entity filters are not dimensions: the API answers those by scanning `seap.search`.
"""
from __future__ import annotations

import psycopg

# The Total's numbers over a group of search rows, as the API's scan defines them (a Record counts once: on its first winner's row).
_CUBE_SQL = """
INSERT INTO seap.rollup_cube
SELECT award_year, channel, value_bucket, has_signals, authority_county, supplier_county,
       (count(*) FILTER (WHERE winner_position = 1))::int, sum(share_bani),
       (count(*) FILTER (WHERE winner_position = 1 AND suspect))::int,
       (count(*) FILTER (WHERE winner_position = 1 AND value_bani IS NULL))::int,
       coalesce(sum(ceiling_bani) FILTER (WHERE winner_position = 1), 0)
  FROM seap.search GROUP BY award_year, channel, value_bucket, has_signals, authority_county, supplier_county
"""

# Per entity, each Record once (the inner GROUP BY), as the API's per-page stats do.
_ENTITY_SQL = """
INSERT INTO seap.rollup_entity
SELECT %(side)s, key, award_year, channel, value_bucket, has_signals,
       count(*)::int, sum(sh), (count(*) FILTER (WHERE suspect))::int, (count(*) FILTER (WHERE no_value))::int, coalesce(sum(ceil), 0)
  FROM (SELECT {key} AS key, record_code, award_year, channel, value_bucket, has_signals, sum(share_bani) AS sh, bool_or(suspect) AS suspect,
               bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil
          FROM seap.search WHERE {key} IS NOT NULL
         GROUP BY {key}, record_code, award_year, channel, value_bucket, has_signals) g
 GROUP BY key, award_year, channel, value_bucket, has_signals
"""

# The first two characters of every folded token of at least two characters: what a 2-character query can be a prefix of.
_PREFIX_SQL = """
INSERT INTO seap.rollup_prefix
SELECT DISTINCT left(tok, 2) FROM seap.search, regexp_split_to_table(doc, ' ') AS tok
 WHERE winner_position = 1 AND length(tok) >= 2
"""


def build_rollup(cur: psycopg.Cursor) -> None:
    """Fill every rollup table from `seap.search`. Call it inside the load transaction, before the commit."""
    cur.execute(_CUBE_SQL)
    cur.execute(_ENTITY_SQL.format(key="authority_key"), {"side": "AUTHORITY"})
    cur.execute(_ENTITY_SQL.format(key="supplier_key"), {"side": "SUPPLIER"})
    cur.execute(_PREFIX_SQL)
    cur.execute("INSERT INTO seap.rollup_meta (generation) VALUES (gen_random_uuid()::text)")
    cur.execute("ANALYZE seap.rollup_cube")
    cur.execute("ANALYZE seap.rollup_entity")
