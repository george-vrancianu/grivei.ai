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


@pytest.fixture(scope="module", params=[True, False], ids=["beside", "in-place"])
def seen(request, server, tmp_path_factory):
    """One rebuild of FIXTURE per mode, read from inside it: when the Signals start, when the BM25 index is about to be built, and the transaction state before the Steps."""
    staged = request.param
    tmp = tmp_path_factory.mktemp("maintenance")
    shutil.copytree(FIXTURE, tmp / "archive")
    name = f"m{time.time_ns()}"
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        c.execute(f'CREATE DATABASE "{name}"')
    seen: dict = {"staged": staged}

    def look(label, cur):
        cur.execute("SELECT indexname FROM pg_indexes WHERE schemaname = 'seap'")
        indexes = {n for (n,) in cur.fetchall()}
        cur.execute("SELECT last_vacuum, last_analyze FROM pg_stat_user_tables WHERE schemaname = 'seap' AND relname = 'search'")
        vacuumed, analyzed = cur.fetchone()
        cur.execute("SHOW maintenance_work_mem")
        seen[label] = {"indexes": indexes, "last_vacuum": vacuumed, "last_analyze": analyzed, "maintenance_work_mem": cur.fetchone()[0]}

    real_signals, real_index, real_run = build_steps_module.build_signals, build_steps_module.create_index, build_steps_module.run_steps

    def signals(cur, *args, **kwargs):
        look("signals", cur)
        return real_signals(cur, *args, **kwargs)

    def index(cur):
        look("search-index", cur)
        return real_index(cur)

    def run(ctx, *args, **kwargs):
        seen["status_before_steps"] = ctx.conn.info.transaction_status
        return real_run(ctx, *args, **kwargs)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(build_steps_module, "build_signals", signals)
        mp.setattr(build_steps_module, "create_index", index)
        mp.setattr(build_steps_module, "run_steps", run)
        rebuild(Archive(tmp / "archive"), f"{server}/{name}", staged=staged)
    return seen


def test_a_beside_build_vacuums_and_analyzes_the_search_table_before_the_bm25_index_is_built(seen):
    if not seen["staged"]:
        pytest.skip("beside builds only")
    assert seen["signals"]["last_vacuum"] is None  # the Signals are what the vacuum waits for
    vacuumed, analyzed = seen["search-index"]["last_vacuum"], seen["search-index"]["last_analyze"]
    assert vacuumed is not None and analyzed >= vacuumed  # the Signals Step's own ANALYZE ran before the VACUUM: only the VACUUM ANALYZE makes this true


def test_an_in_place_build_runs_no_vacuum_between_its_steps(seen):
    if seen["staged"]:
        pytest.skip("in-place builds only")
    assert seen["search-index"]["last_vacuum"] is None  # VACUUM cannot run inside the one transaction


def test_the_key_indexes_exist_before_the_signals_run(seen):
    assert KEY_INDEXES <= seen["signals"]["indexes"]


def test_the_build_session_has_a_larger_maintenance_work_mem(seen):
    assert seen["signals"]["maintenance_work_mem"] == seen["search-index"]["maintenance_work_mem"] == "1GB"


def test_an_in_place_builds_outer_block_is_the_real_transaction(seen):
    """Nothing before run_steps may open a transaction on the connection: its outer block would then be a savepoint and the COMMIT would move."""
    from psycopg.pq import TransactionStatus

    assert seen["status_before_steps"] == TransactionStatus.IDLE
