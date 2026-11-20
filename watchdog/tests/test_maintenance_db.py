"""Maintenance between the Steps of a rebuild (ticket #298, spec #285), through `rebuild` and the graph: the search table is vacuumed and analyzed
before the BM25 build in a beside build, the key indexes exist before the Signals, and the build session has a larger `maintenance_work_mem`.
Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
import time

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import build_steps as build_steps_module  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import FIXTURE, db, server  # noqa: E402,F401

KEY_INDEXES = {"record_authority_key_idx", "search_supplier_key_idx", "record_notice_code_idx"}


def _build_watching(tmp_path, db, monkeypatch, staged: bool) -> dict:
    """Rebuild FIXTURE and read the session from inside it: when the Signals start and when the BM25 index is about to be built."""
    shutil.copytree(FIXTURE, tmp_path / "archive")
    seen: dict = {}

    def look(label, cur):
        cur.execute("SELECT indexname FROM pg_indexes WHERE schemaname = 'seap'")
        indexes = {name for (name,) in cur.fetchall()}
        cur.execute("SELECT last_vacuum IS NOT NULL, last_analyze IS NOT NULL FROM pg_stat_user_tables WHERE schemaname = 'seap' AND relname = 'search'")
        vacuumed, analyzed = cur.fetchone()
        cur.execute("SHOW maintenance_work_mem")
        seen[label] = {"indexes": indexes, "vacuumed": vacuumed, "analyzed": analyzed, "maintenance_work_mem": cur.fetchone()[0]}

    real_signals, real_index = build_steps_module.build_signals, build_steps_module.create_index

    def signals(cur, *args, **kwargs):
        look("signals", cur)
        return real_signals(cur, *args, **kwargs)

    def index(cur):
        look("search-index", cur)
        return real_index(cur)

    monkeypatch.setattr(build_steps_module, "build_signals", signals)
    monkeypatch.setattr(build_steps_module, "create_index", index)
    rebuild(Archive(tmp_path / "archive"), db, staged=staged)
    return seen


def test_a_beside_build_vacuums_and_analyzes_the_search_table_before_the_bm25_index_is_built(tmp_path, db, monkeypatch):
    seen = _build_watching(tmp_path, db, monkeypatch, staged=True)
    assert seen["signals"]["vacuumed"] is False  # the Signals are what the vacuum waits for
    assert seen["search-index"]["vacuumed"] and seen["search-index"]["analyzed"]


def test_an_in_place_build_runs_no_vacuum_between_its_steps(tmp_path, db, monkeypatch):
    seen = _build_watching(tmp_path, db, monkeypatch, staged=False)  # VACUUM cannot run inside the one transaction
    assert seen["search-index"]["vacuumed"] is False


@pytest.mark.parametrize("staged", [True, False], ids=["beside", "in-place"])
def test_the_key_indexes_exist_before_the_signals_run(tmp_path, db, monkeypatch, staged):
    seen = _build_watching(tmp_path, db, monkeypatch, staged=staged)
    assert KEY_INDEXES <= seen["signals"]["indexes"]


@pytest.mark.parametrize("staged", [True, False], ids=["beside", "in-place"])
def test_the_build_session_has_a_larger_maintenance_work_mem(tmp_path, db, monkeypatch, staged):
    seen = _build_watching(tmp_path, db, monkeypatch, staged=staged)
    assert seen["signals"]["maintenance_work_mem"] == seen["search-index"]["maintenance_work_mem"] == "1GB"
