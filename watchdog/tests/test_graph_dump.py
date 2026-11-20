"""The graph dump helper (graph_dump.py): the schema guard (no Docker), and its exclusions and determinism (Docker, the container of test_bulk_loader_db.py)."""
import shutil
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from graph_dump import EXCLUDED_COLUMNS, GRAPH_SCHEMAS, dump_graph, schemas_in_sql_files  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401

FIXTURE = Path(__file__).parent / "fixtures" / "archive-bulk"


def test_every_schema_the_sql_files_create_is_dumped():
    assert schemas_in_sql_files() <= set(GRAPH_SCHEMAS)


def test_the_guard_sees_a_schema_a_sql_file_adds(tmp_path):
    (tmp_path / "x_schema.sql").write_text("DROP SCHEMA IF EXISTS fresh CASCADE;\nCREATE SCHEMA fresh;\nCREATE TABLE core.t (a int);\n")
    assert schemas_in_sql_files(tmp_path) == {"fresh", "core"}


def test_time_columns_and_listed_columns_are_left_out_and_rows_come_sorted(db, monkeypatch):
    monkeypatch.setitem(EXCLUDED_COLUMNS, "gd_probe.t.noise", "test")
    with psycopg.connect(db, autocommit=True) as c:
        c.execute("CREATE SCHEMA gd_probe")
        c.execute("CREATE TABLE gd_probe.t (id int, label text, noise uuid, at timestamptz, plain timestamp)")
        c.execute("INSERT INTO gd_probe.t VALUES (2, 'b', gen_random_uuid(), now(), now()), (1, 'a', gen_random_uuid(), now(), now())")
        c.execute("CREATE TABLE gd_probe.only_time (at timestamptz)")
        c.execute("INSERT INTO gd_probe.only_time VALUES (now()), (now())")
    assert dump_graph(db, schemas=("gd_probe", "missing_schema")) == {
        "gd_probe.only_time": [{}, {}], "gd_probe.t": [{"id": 1, "label": "a"}, {"id": 2, "label": "b"}]}


def test_a_rebuilt_graph_dumps_every_table_and_the_same_archive_dumps_the_same_twice(db, tmp_path):
    root = tmp_path / "archive"
    shutil.copytree(FIXTURE, root)
    rebuild(Archive(root), db)
    first = dump_graph(db)
    assert first["seap.record"] and first["seap.rollup_meta"] == [{}]  # one row; its only comparable fact is that it exists
    assert {t.split(".")[0] for t in first} == set(GRAPH_SCHEMAS)
    rebuild(Archive(root), db)
    second = dump_graph(db)
    # build.step holds each run's own output (the first run quarantined a unit, so the second run's `quarantined` list is empty): same rows, not the same summaries
    assert [(r["name"], r["ordinal"]) for r in second.pop("build.step")] == [(r["name"], r["ordinal"]) for r in first.pop("build.step")]
    assert second == first
