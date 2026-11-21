"""Maintenance between the Steps of a rebuild (ticket #298, spec #285), through `rebuild` and the graph: the search table is analyzed
before the BM25 build, the key indexes exist before the Signals, the build session has a larger `maintenance_work_mem`, and the heavy Steps (and only they)
run with their own `work_mem` (#306).
Needs Docker (the container fixture of test_bulk_loader_db.py); skipped without it."""
import shutil
import time

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import build_steps as build_steps_module  # noqa: E402
from pipeline.onrc import build as onrc_build  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import FIXTURE, db, server  # noqa: E402,F401

KEY_INDEXES = {"record_authority_key_idx", "record_notice_code_idx"}


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
        maintenance = cur.fetchone()[0]
        cur.execute("SHOW work_mem")
        seen[label] = {"indexes": indexes, "last_vacuum": vacuumed, "last_analyze": analyzed, "maintenance_work_mem": maintenance, "work_mem": cur.fetchone()[0]}

    real_signals, real_index, real_run = build_steps_module.build_signals, build_steps_module.create_index, build_steps_module.run_steps
    real_frameworks = build_steps_module.build_frameworks

    def frameworks(cur, *args, **kwargs):  # a light Step right after the heavy `onrc` Step
        look("frameworks", cur)
        return real_frameworks(cur, *args, **kwargs)

    def signals(cur, *args, **kwargs):
        look("signals", cur)
        return real_signals(cur, *args, **kwargs)

    def index(cur):
        look("search-index", cur)
        return real_index(cur)

    def run(ctx, *args, **kwargs):
        seen["status_before_steps"] = ctx.conn.info.transaction_status
        ctx.cur.execute("SHOW work_mem")  # no schema yet: not `look`
        seen["before"] = {"work_mem": ctx.cur.fetchone()[0]}
        return real_run(ctx, *args, **kwargs)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(build_steps_module, "build_signals", signals)
        mp.setattr(build_steps_module, "create_index", index)
        mp.setattr(build_steps_module, "run_steps", run)
        mp.setattr(build_steps_module, "build_frameworks", frameworks)
        rebuild(Archive(tmp / "archive"), f"{server}/{name}", staged=staged)
    return seen


def test_the_search_table_is_written_once_and_analyzed_before_the_bm25_index_is_built(seen):
    """seap.search is written by one INSERT (#305), so no step leaves dead row versions for a vacuum to clear: it only needs statistics before the index and the rollup."""
    if not seen["staged"]:
        pytest.skip("beside builds only: the statistics of an uncommitted in-place table are not in pg_stat yet")
    assert seen["search-index"]["last_analyze"] is not None


def test_an_in_place_build_runs_no_vacuum_between_its_steps(seen):
    if seen["staged"]:
        pytest.skip("in-place builds only")
    assert seen["search-index"]["last_vacuum"] is None  # VACUUM cannot run inside the one transaction


def test_the_key_indexes_exist_before_the_signals_run(seen):
    assert KEY_INDEXES <= seen["signals"]["indexes"]
    assert "search_supplier_key_idx" in seen["search-index"]["indexes"]  # the final seap.search carries its supplier-key index when the BM25 build starts


def test_the_build_session_has_a_larger_maintenance_work_mem(seen):
    assert seen["signals"]["maintenance_work_mem"] == seen["search-index"]["maintenance_work_mem"] == "1GB"


def test_an_in_place_builds_outer_block_is_the_real_transaction(seen):
    """Nothing before run_steps may open a transaction on the connection: its outer block would then be a savepoint and the COMMIT would move."""
    from psycopg.pq import TransactionStatus

    assert seen["status_before_steps"] == TransactionStatus.IDLE


def test_a_heavy_step_runs_with_its_own_work_mem_and_the_next_one_does_not_inherit_it(seen):
    """SET LOCAL lasts to the end of the top-level transaction, and under --in-place the Steps are savepoints of one: the value must be put back when the Step ends."""
    default = seen["before"]["work_mem"]
    assert seen["signals"]["work_mem"] == build_steps_module.MEDIUM_WORK_MEM != default  # the Step's own block
    assert seen["frameworks"]["work_mem"] == default  # the Step after `onrc`
    assert seen["search-index"]["work_mem"] == default  # after signals, search-rows and the rollup


@pytest.fixture(scope="module", params=[True, False], ids=["beside", "in-place"])
def onrc_seen(request, server, tmp_path_factory):
    """A rebuild of an archive with ONRC snapshots, read from inside a snapshot's transaction (a segment of the `onrc` Step) and from the Step after `onrc`."""
    tmp = tmp_path_factory.mktemp("maintenance-onrc")
    shutil.copytree(FIXTURE.parent / "archive-onrc", tmp / "archive")
    name = f"m{time.time_ns()}"
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        c.execute(f'CREATE DATABASE "{name}"')
    seen: dict = {"snapshots": []}
    real_apply, real_frameworks = onrc_build._apply_snapshot, build_steps_module.build_frameworks

    def apply_snapshot(cur, *args, **kwargs):
        cur.execute("SHOW work_mem")
        seen["snapshots"].append(cur.fetchone()[0])
        return real_apply(cur, *args, **kwargs)

    def frameworks(cur, *args, **kwargs):
        cur.execute("SHOW work_mem")
        seen["after"] = cur.fetchone()[0]
        return real_frameworks(cur, *args, **kwargs)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(onrc_build, "_apply_snapshot", apply_snapshot)
        mp.setattr(build_steps_module, "build_frameworks", frameworks)
        rebuild(Archive(tmp / "archive"), f"{server}/{name}", staged=request.param)
    return seen


def test_an_onrc_snapshots_transaction_has_its_own_work_mem_that_ends_with_it(onrc_seen):
    assert onrc_seen["snapshots"] and set(onrc_seen["snapshots"]) == {build_steps_module.ONRC_WORK_MEM}
    assert onrc_seen["after"] not in {build_steps_module.ONRC_WORK_MEM, build_steps_module.MEDIUM_WORK_MEM}
