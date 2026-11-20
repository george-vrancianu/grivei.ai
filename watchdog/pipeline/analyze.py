"""Planner statistics inside the rebuild's Step transactions (one transaction for all Steps in place, one per Step when staged).

A table a step bulk-fills has no statistics until something analyzes it (autovacuum cannot run inside the uncommitted transaction, and never reaches a
temp table). The rule: every step that bulk-fills a table analyzes it before any later step reads it. ANALYZE samples, so it is cheap; it is not VACUUM."""
import psycopg


def analyze(cur: psycopg.Cursor, *tables: str) -> None:
    """`ANALYZE` each schema-qualified table (or temp table name), in the caller's transaction."""
    for table in tables:
        cur.execute(f"ANALYZE {table}")
