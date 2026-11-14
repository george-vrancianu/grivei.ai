"""ONRC's search table and its pg_search index (#176), built by `pipeline rebuild` after the SEAP search index (it reads who is a SEAP counterparty).

`onrc.search` (pipeline/sql/onrc_schema.sql) holds one row per registration of the newest snapshot, except the sole traders' (PFA, II, IF: named after
a natural person, so never findable by name here, ADR 0009 / `pipeline/sole_trader.py`). The BM25 index lives in the same transaction as the rows;
VACUUM ANALYZE runs right after the commit, as for `seap.search` (pipeline/search.py). The document is folded with the same fold as SEAP's and as the
API's query (pipeline/fold.py <-> api/src/fold.ts), so a typed word matches the published one whatever its diacritics, case or legal form.
"""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

from ..fold import fold
from ..sole_trader import is_sole_trader

# Text columns that are filtered or grouped on are `pdb.literal` (one exact term, a fast field); the document is tokenised by `pdb.simple`
# (already folded: no further folding); dates and booleans are fast fields. Every column the query filters, groups or orders on is in the index.
INDEX_SQL = """
CREATE INDEX search_bm25 ON onrc.search USING paradedb (
    id,
    (doc::pdb.simple),
    (reg_no::pdb.literal), (cui::pdb.literal), registration_date,
    (area::pdb.literal), (statuses::pdb.literal), (caen::pdb.literal), seap_counterparty
)"""

BATCH = 5000

# A registration of the newest snapshot with what the document and the filters need. The aliases are every other name ONRC listed it under.
_SOURCE = """
SELECT r.reg_no, r.cui, r.name, r.legal_form, r.registration_date, r.county_iso,
       coalesce((SELECT array_agg(DISTINCT n.name) FROM onrc.name_span n WHERE n.reg_no = r.reg_no AND n.name <> r.name), '{}') AS aliases,
       coalesce((SELECT array_agg(c.code ORDER BY c.code) FROM onrc.caen c WHERE c.reg_no = r.reg_no), '{}') AS caen,
       coalesce((SELECT array_agg(sp.code::text ORDER BY sp.code) FROM onrc.status_span sp WHERE sp.reg_no = r.reg_no AND sp.last_seen = r.snapshot_date), '{}') AS statuses,
       (r.cui IS NOT NULL AND EXISTS (SELECT 1 FROM onrc_counterparty cp WHERE cp.cui = r.cui)) AS seap_counterparty
  FROM onrc.registration r ORDER BY r.reg_no"""

_COUNTERPARTIES = """
CREATE TEMP TABLE onrc_counterparty ON COMMIT DROP AS
SELECT authority_key AS cui FROM seap.record WHERE authority_key IS NOT NULL
UNION
SELECT supplier_key FROM seap.search WHERE supplier_key IS NOT NULL"""


@dataclass
class SearchSummary:
    indexed: int = 0
    sole_traders_left_out: int = 0

    def line(self) -> str:
        return f"onrc search: {self.indexed} registrations indexed; {self.sole_traders_left_out} sole traders (PFA, II, IF) left out"


def build_onrc_search(cur: psycopg.Cursor) -> SearchSummary:
    """`onrc.search` and its BM25 index from `onrc.registration` (in the caller's transaction)."""
    summary = SearchSummary()
    cur.execute(_COUNTERPARTIES)
    cur.execute("CREATE INDEX onrc_counterparty_cui ON onrc_counterparty (cui)")
    with cur.connection.cursor(name="onrc_search_source") as source:  # streamed: the register has millions of rows; a COPY cannot run while the cursor fetches, so one batch at a time
        source.execute(_SOURCE)
        while batch := source.fetchmany(BATCH):
            rows = []
            for reg_no, cui, name, legal_form, registered, county_iso, aliases, caen, statuses, counterparty in batch:
                if is_sole_trader(name, legal_form):
                    summary.sole_traders_left_out += 1
                    continue
                doc = fold(" ".join([name, *(a for a in aliases if not is_sole_trader(a, None)), cui or "", reg_no, *caen]))
                rows.append((reg_no, cui, registered, f"RO-{county_iso}" if county_iso else "UNPLACED", statuses, caen, counterparty, doc))
            with cur.copy("COPY onrc.search (reg_no, cui, registration_date, area, statuses, caen, seap_counterparty, doc) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)
            summary.indexed += len(rows)
    cur.execute(INDEX_SQL)
    # the planner's statistics of every table the API reads for a page of results: without them a join over the national register can pick a scan
    cur.execute("ANALYZE onrc.search")
    for table in ("registration", "status_span", "name_span", "caen", "status_name", "snapshot"):
        cur.execute(f"ANALYZE onrc.{table}")
    return summary


def vacuum(db_url: str) -> None:
    """VACUUM ANALYZE of the search table on its own autocommit connection: call it right after the load commits."""
    with psycopg.connect(db_url, autocommit=True) as conn:
        conn.execute("VACUUM ANALYZE onrc.search")
