"""The search table's pg_search index and its upkeep (#68).

`seap.search` (pipeline/sql/seap_schema.sql) holds one row per Record x winner. Its BM25 index lives in the same Postgres and
is updated by the same transaction as the rows: `create_index` runs inside the load transaction, so a load is visible to
search only when it commits. VACUUM cannot run in a transaction, so `vacuum` runs right after the commit (it merges the
index's segments and drops dead rows: a broad query is several times slower without it). Never `visibility => 'raw'` in a
query: between a load and its VACUUM it could count dead rows, which is wrong for money.
"""
from __future__ import annotations

import psycopg

# The preset awarded-value buckets, in bani, upper edge inclusive. Mirrors VALUE_BUCKETS in
# explorer/packages/contract/src/value-buckets.ts (seam 1 checks the edges through the GraphQL chip).
VALUE_BUCKETS: tuple[tuple[str, int | None], ...] = (
    ("UP_TO_10K", 1_000_000),
    ("UP_TO_135K", 13_506_000),
    ("UP_TO_270K", 27_012_000),
    ("UP_TO_900K", 90_040_000),
    ("UP_TO_9M", 900_400_000),
    ("UP_TO_1B", 100_000_000_000),
    ("OVER_1B", None),
)


def value_bucket(value_bani: int | None) -> str | None:
    """The bucket a value falls in; None for a Record with no value (it matches no bucket)."""
    if value_bani is None:
        return None
    for name, upto in VALUE_BUCKETS:
        if upto is None or value_bani <= upto:
            return name
    return None  # unreachable: the last bucket is open


# Text columns that are filtered or grouped on are `pdb.literal` (one exact term, a fast field), the document is tokenised
# by `pdb.simple` (already folded: ascii_folding is a harmless second guard), numbers, dates and booleans are fast fields.
INDEX_SQL = """
CREATE INDEX search_bm25 ON seap.search USING paradedb (
    id,
    (doc::pdb.simple('ascii_folding=true')),
    (record_code::pdb.literal), winner_position, winners,
    (channel::pdb.literal), award_date, award_year, value_bani, (value_bucket::pdb.literal), has_signals,
    (badges::pdb.literal), (procedure::pdb.literal), (cpv_code::pdb.literal),
    counted_bani, ceiling_bani, suspect, share_bani,
    (authority_key::pdb.literal), (authority_county::pdb.literal), (authority_uat::pdb.literal),
    (supplier_key::pdb.literal), (supplier_county::pdb.literal)
)"""


def create_index(cur: psycopg.Cursor) -> None:
    """Build the BM25 index (in the caller's transaction). Built after the rows are in: one pass, few segments."""
    cur.execute(INDEX_SQL)


def vacuum(db_url: str) -> None:
    """VACUUM ANALYZE of the search table, on its own autocommit connection: call it right after the load commits."""
    with psycopg.connect(db_url, autocommit=True) as conn:
        conn.execute("VACUUM ANALYZE seap.search")
