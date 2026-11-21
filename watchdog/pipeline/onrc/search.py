"""ONRC's search table and its pg_search index (#176), built by `pipeline rebuild` after the SEAP search index (it reads who is a SEAP counterparty).

`onrc.search` (pipeline/sql/onrc_schema.sql) holds one row per registration of the newest snapshot, except the sole traders' (PFA, II, IF: named after
a natural person, so never findable by name here, ADR 0009 / `pipeline/sole_trader.py`). The BM25 index lives in the same transaction as the rows (the Step's);
VACUUM ANALYZE runs right after the commit, as for `seap.search` (pipeline/search.py). The document is folded with the same fold as SEAP's and as the
API's query (pipeline/fold.py <-> api/src/fold.ts), so a typed word matches the published one whatever its diacritics, case or legal form.
"""
from __future__ import annotations

from dataclasses import dataclass

import psycopg

from ..analyze import analyze
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

# The source: a registration of the newest snapshot with what the document and the filters need. The aliases are every other name ONRC listed it under.
# Each lookup table is aggregated once and joined once to the registrations (no per-registration subqueries: those ran one index descent each, three per
# registration, over the national register). It is materialized into a temp table, then streamed in reg_no order, which is the order `id` follows.
_CREATE_ROWS = """
CREATE TEMP TABLE onrc_search_rows ON COMMIT DROP AS
WITH al AS (SELECT n.reg_no, array_agg(DISTINCT n.name) AS aliases
              FROM onrc.name_span n JOIN onrc.registration r USING (reg_no)
             WHERE n.name <> r.name GROUP BY n.reg_no),
     ca AS (SELECT reg_no, array_agg(code ORDER BY code) AS caen FROM onrc.caen GROUP BY reg_no),
     st AS (SELECT sp.reg_no, array_agg(sp.code::text ORDER BY sp.code) AS statuses
              FROM onrc.status_span sp JOIN onrc.registration r USING (reg_no)
             WHERE sp.last_seen = r.snapshot_date GROUP BY sp.reg_no)
SELECT r.reg_no, r.cui, r.name, r.legal_form, r.registration_date, r.county_iso,
       coalesce(al.aliases, '{}') AS aliases, coalesce(ca.caen, '{}') AS caen, coalesce(st.statuses, '{}') AS statuses,
       (cp.cui IS NOT NULL) AS seap_counterparty
  FROM onrc.registration r
       LEFT JOIN al USING (reg_no) LEFT JOIN ca USING (reg_no) LEFT JOIN st USING (reg_no)
       LEFT JOIN onrc_counterparty cp ON cp.cui = r.cui"""

_SELECT_ROWS = """
SELECT reg_no, cui, name, legal_form, registration_date, county_iso, aliases, caen, statuses, seap_counterparty
  FROM onrc_search_rows ORDER BY reg_no"""

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
    # the source's joins and aggregates plan on these (hash joins over the whole tables); without statistics the planner has no row counts to choose them by (#287)
    analyze(cur, "onrc_counterparty", "onrc.status_span", "onrc.name_span", "onrc.caen")
    cur.execute(_CREATE_ROWS)
    with cur.connection.cursor(name="onrc_search_source") as source:  # streamed: the register has millions of rows; a COPY cannot run while the cursor fetches, so one batch at a time
        source.execute(_SELECT_ROWS)
        while batch := source.fetchmany(BATCH):
            rows = []
            for reg_no, cui, name, legal_form, registered, county_iso, aliases, caen, statuses, counterparty in batch:
                if is_sole_trader(name, legal_form):
                    summary.sole_traders_left_out += 1
                    continue
                kept = [a for a in aliases if not is_sole_trader(a, None)]  # the same list feeds the document and the API's highlights
                doc = fold(" ".join([name, *kept, cui or "", reg_no, *caen]))
                rows.append((reg_no, cui, registered, f"RO-{county_iso}" if county_iso else "UNPLACED", statuses, caen, counterparty, kept, doc))
            with cur.copy("COPY onrc.search (reg_no, cui, registration_date, area, statuses, caen, seap_counterparty, aliases, doc) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)
            summary.indexed += len(rows)
    cur.execute("DROP TABLE onrc_search_rows")  # its rows are in onrc.search now; free them before the index build
    cur.execute(INDEX_SQL)
    # the new table the API reads for a page of results
    analyze(cur, "onrc.search")
    return summary


def vacuum(db_url: str) -> None:
    """VACUUM ANALYZE of the search table on its own autocommit connection: call it right after the load commits."""
    with psycopg.connect(db_url, autocommit=True) as conn:
        conn.execute("VACUUM ANALYZE onrc.search")
