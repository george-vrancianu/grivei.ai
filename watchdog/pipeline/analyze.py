"""Planner statistics inside the rebuild's Step transactions (one transaction for all Steps in place, one per Step when staged).

A table a step bulk-fills has no statistics until something analyzes it (autovacuum cannot run inside the uncommitted transaction, and never reaches a
temp table). The rule: every step that bulk-fills a table analyzes it before any later step reads it. ANALYZE samples, so it is cheap; it is not VACUUM (a beside build vacuums between its committed Steps: the `vacuum` field of a Step, build_steps.py)."""
from contextlib import contextmanager

import psycopg


def analyze(cur: psycopg.Cursor, *tables: str) -> None:
    """`ANALYZE` each schema-qualified table (or temp table name), in the caller's transaction."""
    for table in tables:
        cur.execute(f"ANALYZE {table}")


@contextmanager
def local_work_mem(cur: psycopg.Cursor, size: str | None):
    """`work_mem` raised to `size` for the statements inside the block, in the caller's transaction, and back to the session's own value when the block ends.

    `SET LOCAL` lasts to the end of the top-level transaction. A staged Step is its own transaction, but under `--in-place` the Steps are savepoints of one
    transaction and releasing a savepoint does not undo a `SET LOCAL`, so the value is put back here instead of leaking into the Steps that follow. If the block
    raises, the transaction (staged) or the savepoint (in place) rolls back and takes the setting with it. `None` changes nothing."""
    if size is None:
        yield
        return
    cur.execute("SELECT set_config('work_mem', %s, true)", (size,))
    yield
    cur.execute("SET LOCAL work_mem TO DEFAULT")
