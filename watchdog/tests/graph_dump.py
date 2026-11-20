"""The whole graph as one comparable Python value (ticket #290, spec #285): the resume and pause tests compare the graph a rebuild leaves, before and after a change,
or killed and resumed against a clean run, with `dump_graph`. Used by the DB tests; not a test module itself.

- Tables come from the catalog (every base table of every schema in `GRAPH_SCHEMAS`), never from a hand-written table list.
- Every `timestamp` / `timestamptz` column is left out (found from the catalog): a wall-clock time differs between two runs of the same build.
- `EXCLUDED_COLUMNS` names any other column that differs between two identical builds; each has its reason.
- Rows are sorted on a stable repr, so the dump does not depend on physical order. A row is a dict column -> value, so a failed `==` shows which column differs.
- `build` (the Steps' hand-offs, sql/build_schema.sql) is part of the dump; a schema in `GRAPH_SCHEMAS` that does not exist is skipped (a graph built before it)."""
import re
from pathlib import Path

import psycopg

# Every schema the rebuild writes: the schema SQL files create seap, onrc, withheld, amepip, aep, financials and donations; core_schema.sql
# creates only tables in `core`; `build` holds the hand-offs (ticket #290) and grows into the step ledger (ticket #291).
GRAPH_SCHEMAS = ("seap", "core", "onrc", "withheld", "amepip", "aep", "financials", "donations", "build")

EXCLUDED_COLUMNS = {
    "seap.rollup_meta.generation": "a fresh gen_random_uuid() per rebuild (rollup.py)",
}

SQL_DIR = Path(__file__).resolve().parents[1] / "pipeline" / "sql"
_TIME_TYPES = ("timestamp with time zone", "timestamp without time zone")


def schemas_in_sql_files(sql_dir: Path = SQL_DIR) -> set[str]:
    """Every schema the schema SQL files create or put a table in (`CREATE SCHEMA x`, `CREATE TABLE x.y`): the guard's source of truth."""
    found = set()
    for path in sql_dir.glob("*.sql"):
        text = path.read_text(encoding="utf-8")
        found.update(re.findall(r"^\s*CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", text, re.I | re.M))
        found.update(re.findall(r"^\s*CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\.\w+", text, re.I | re.M))
    return found


def dump_graph(url: str, schemas=GRAPH_SCHEMAS) -> dict[str, list[dict]]:
    """{ "schema.table": [row as dict, ...] } for every table of `schemas`, rows sorted, time columns and EXCLUDED_COLUMNS left out."""
    graph = {}
    with psycopg.connect(url) as conn:
        tables = conn.execute(
            "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = ANY(%s) "
            "ORDER BY 1, 2", (list(schemas),)).fetchall()
        for schema, table in tables:
            qualified = f"{schema}.{table}"
            columns = [name for name, kind in conn.execute(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
                (schema, table)).fetchall() if kind not in _TIME_TYPES and f"{qualified}.{name}" not in EXCLUDED_COLUMNS]
            if not columns:
                graph[qualified] = [{}] * conn.execute(f'SELECT count(*) FROM "{schema}"."{table}"').fetchone()[0]  # only the row count is comparable
                continue
            select = ", ".join(f'"{c}"' for c in columns)
            rows = [dict(zip(columns, row)) for row in conn.execute(f'SELECT {select} FROM "{schema}"."{table}"').fetchall()]
            graph[qualified] = sorted(rows, key=repr)
    return graph
