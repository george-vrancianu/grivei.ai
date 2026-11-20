"""The Steps' hand-offs are persisted in `build.step` and read back from the database (ticket #290, spec #285), through `pipeline rebuild` and the graph.
Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import json
import shutil
from dataclasses import replace
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

import pipeline.build_steps as build_steps_module  # noqa: E402
from graph_dump import dump_graph  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.build_steps import STEPS  # noqa: E402
from pipeline.bulk import KINDS  # noqa: E402
from pipeline.hand_offs import (MissingHandOff, load_anaf_names, load_bulk_rows, load_data_through, load_last_source_file_id, load_loaded_hashes,  # noqa: E402
                                load_onrc_summary, load_set_aside, onrc_hand_off, read_step, write_step)
from pipeline.onrc.people import SECRET_ENV  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import db, server  # noqa: E402,F401

FIXTURES = Path(__file__).parent / "fixtures"


def _build(db, tmp_path, monkeypatch, *worlds, full=True):
    monkeypatch.setenv(SECRET_ENV, "dummy-secret-for-tests-only-0123456789")
    root = tmp_path / "archive"
    for name in worlds:
        shutil.copytree(FIXTURES / name, root, dirs_exist_ok=True)
    data = tmp_path / "data"
    shutil.copytree(FIXTURES / "placement-data", data)
    summary = rebuild(Archive(root), db, placement_dir=data, geo_dir=tmp_path / "geo", known_gaps_path=FIXTURES / "mf-known-gaps.csv",
                      overrides_path=FIXTURES / "identity-overrides.toml", today=date(2026, 11, 20))
    return Archive(root), summary


def _rows(db):
    with psycopg.connect(db) as c:
        return dict(c.execute("SELECT name, summary FROM build.step").fetchall()), c.execute("SELECT name, ordinal FROM build.step ORDER BY ordinal").fetchall()


def test_every_step_writes_its_row_in_order_and_a_rebuild_writes_the_same_rows_again(db, tmp_path, monkeypatch):
    _build(db, tmp_path, monkeypatch, "archive-onrc-signals")
    summaries, order = _rows(db)
    assert order == [(s.name, i) for i, s in enumerate(STEPS)]
    assert all(isinstance(v, dict) for v in summaries.values())
    first = dump_graph(db, ("build",))["build.step"]
    text = json.dumps(summaries)
    assert "T00:00" not in text and "+00:00" not in text  # no timestamp in a summary
    _build(db, tmp_path / "again", monkeypatch, "archive-onrc-signals")  # a fresh build of the same archive: the same rows
    assert dump_graph(db, ("build",))["build.step"] == first


def test_the_onrc_summary_comes_back_from_its_row_with_every_field(db, tmp_path, monkeypatch):
    _, summary = _build(db, tmp_path, monkeypatch, "archive-onrc-people")
    assert summary.onrc.snapshots and summary.onrc.people.snapshot  # a real summary, with the nested people
    with psycopg.connect(db) as c:
        loaded = load_onrc_summary(c.cursor())
    assert loaded == replace(summary.onrc, entities_only=0)  # the entities Step counts its own, in its own row
    summaries, _ = _rows(db)
    assert summaries["entities"]["onrc_entities_only"] == summary.onrc.entities_only


def test_a_build_without_an_onrc_archive_still_has_the_onrc_row(db, tmp_path):
    from test_bulk_loader_db import _copy_fixture

    summary = rebuild(_copy_fixture(tmp_path), db)
    with psycopg.connect(db) as c:
        row = read_step(c.cursor(), "onrc")
        assert row["present"] is True and row["summary"]["snapshots"] == 0  # build_onrc returned an empty summary: the explicit "nothing archived"
        assert load_onrc_summary(c.cursor()).snapshots == 0
        assert c.execute("SELECT summary FROM build.step WHERE name = 'entities'").fetchone()[0]["onrc_entities_only"] == 0
    assert summary.records == 13


def test_an_absent_onrc_summary_is_an_explicit_value_and_loads_as_none(db):
    with psycopg.connect(db) as c:
        c.execute("CREATE SCHEMA build; CREATE TABLE build.step (name text PRIMARY KEY, ordinal integer NOT NULL UNIQUE, summary jsonb NOT NULL)")
        write_step(c.cursor(), "onrc", 2, onrc_hand_off(None))
        assert onrc_hand_off(None) == {"present": False}
        assert load_onrc_summary(c.cursor()) is None


def test_the_entities_step_fails_loudly_when_the_onrc_row_is_missing(db, tmp_path, monkeypatch):
    """Not the silent "no ONRC entities" branch: a Step whose hand-off is gone stops the build, through `pipeline rebuild`."""
    real = build_steps_module.write_step
    monkeypatch.setattr(build_steps_module, "write_step", lambda cur, name, ordinal, summary: None if name == "onrc" else real(cur, name, ordinal, summary))
    with pytest.raises(MissingHandOff, match="no row for the 'onrc' Step"):
        _build(db, tmp_path, monkeypatch, "archive-onrc-signals")
    with psycopg.connect(db) as c:  # the build rolled back with it: no half graph
        assert c.execute("SELECT to_regclass('build.step')").fetchone()[0] is None or c.execute("SELECT count(*) FROM build.step").fetchone()[0] == 0


def test_the_loader_raises_on_a_missing_row_even_when_the_table_is_empty(db):
    with psycopg.connect(db) as c:
        c.execute("CREATE SCHEMA build; CREATE TABLE build.step (name text PRIMARY KEY, ordinal integer NOT NULL UNIQUE, summary jsonb NOT NULL)")
        with pytest.raises(MissingHandOff, match="'onrc'"):
            load_onrc_summary(c.cursor())


def test_the_values_the_graph_holds_are_loaded_from_their_tables(db, tmp_path, monkeypatch):
    archive, summary = _build(db, tmp_path, monkeypatch, "archive-onrc-signals")
    with psycopg.connect(db) as c:
        cur = c.cursor()
        assert load_anaf_names(cur) and len(load_anaf_names(cur)) == summary.anaf_found
        assert load_last_source_file_id(cur) == summary.files_loaded
        assert load_data_through(cur) == dict(c.execute("SELECT kind, through::text FROM core.data_through WHERE source = 'SEAP'").fetchall())
        hashes = load_loaded_hashes(cur)
        assert len(hashes) == c.execute("SELECT count(*) FROM seap.source_file WHERE stream = 'bulk'").fetchone()[0]
        assert {kind for kind, _ in hashes} <= set(KINDS)  # the archive's kind (da), not the label (DA)


def test_the_units_hand_offs_come_back_from_their_row(db, tmp_path):
    """bulk_rows (data rows read, not the loaded Records) and the set-aside tails, as the Coverage grid reads them."""
    from test_bulk_loader_db import _no_gaps
    from test_real_headers import _CONTRACTE_HEAD, _CONTRACTE_ROWS, _DA_HEAD, _DA_ROW, _DA_ROW_2

    a = Archive(tmp_path / "a")
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2022Q2", fetched_at=datetime(2022, 9, 15, 9, tzinfo=timezone.utc),
                 files={"t2.csv": (_DA_HEAD + _DA_ROW + _DA_ROW_2 + _CONTRACTE_HEAD + _CONTRACTE_ROWS).encode()}, via="v")
    summary = rebuild(a, db, known_gaps_path=_no_gaps(tmp_path))
    with psycopg.connect(db) as c:
        assert load_set_aside(c.cursor(), a.root) == summary.set_aside and summary.set_aside
        assert load_bulk_rows(c.cursor()) == {("DA", (2022, 2)): 2}
        units = read_step(c.cursor(), "units")
    assert units["files_loaded"] == 1 and units["set_aside"][0]["path"].endswith("t2.csv") and not units["set_aside"][0]["path"].startswith("/")
