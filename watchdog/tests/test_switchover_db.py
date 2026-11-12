"""Rebuild beside the live database, check, switch over (#82, ADR 0004), against a real ParadeDB. Needs Docker (the one throwaway container of
test_bulk_loader_db.py: `pp37-pytest-<pid>`, 1 GB cap, removed at the end); skipped without it."""
import shutil
import threading
import time
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import rebuild as rebuild_module  # noqa: E402
from pipeline import switchover  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import FIXTURE, server  # noqa: E402,F401


@pytest.fixture
def live(server):
    name = f"live{time.time_ns()}"
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        c.execute(f'CREATE DATABASE "{name}"')
    return f"{server}/{name}"


def _archive(tmp_path, name: str, drop: tuple[str, ...] = ()) -> Archive:
    root = tmp_path / name
    shutil.copytree(FIXTURE, root)
    for d in drop:
        shutil.rmtree(root / d)
    return Archive(root)


def _count(url: str, table: str = "seap.record") -> int:
    with psycopg.connect(url) as c:
        return c.execute(f"SELECT count(*) FROM {table}").fetchone()[0]


def _databases(url: str) -> set[str]:
    with psycopg.connect(switchover.names_of(url).admin_url) as c:
        return {r[0] for r in c.execute("SELECT datname FROM pg_database")}


def _build(archive: Archive):
    return lambda url, gate=None: rebuild(archive, url, gate=gate)


def test_a_rebuild_switches_over_only_after_its_checks_pass_keeps_the_old_graph_and_rollback_cleanup_work(live, tmp_path):
    names = switchover.names_of(live)
    old = _archive(tmp_path, "old", drop=("seap/bulk/dan",))
    rebuild(old, live)  # the live graph: the DA files only
    assert _count(live) == 6
    lines = []

    summary = switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lines.append)

    assert summary.records == 13 and _count(live) == 13  # the live name serves the new graph
    assert _count(names.prev_url) == 6  # and the old one is kept beside it
    assert _databases(live) >= {names.live, names.prev} and names.next not in _databases(live)
    assert any("checks passed" in line for line in lines) and any("DONE" in line for line in lines)
    with psycopg.connect(live) as c:  # the BM25 index came along with the rename and answers
        assert c.execute("SELECT count(*) FROM seap.search WHERE id @@@ pdb.all()").fetchone()[0] == _count(live, "seap.search")

    switchover.rollback(live, lines.append)
    assert _count(live) == 6 and _count(names.prev_url) == 13  # swapped back, the rolled-back one kept
    switchover.rollback(live, lines.append)
    assert _count(live) == 13  # and rollback is its own undo

    assert set(switchover.cleanup(live, lines.append)) == {names.prev}
    assert _databases(live) >= {names.live} and names.prev not in _databases(live) and _count(live) == 13  # the live one is untouched
    with pytest.raises(LookupError):
        switchover.rollback(live, lines.append)


def test_a_failed_check_leaves_the_live_graph_served_and_keeps_the_new_one_for_a_look(live, tmp_path):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "full"), live)
    before = _count(live)
    lines = []
    shrunk = _archive(tmp_path, "shrunk", drop=("seap/bulk/dan", "seap/bulk/da/2023Q1", "seap/bulk/da/2023Q2"))

    with pytest.raises(switchover.SwitchoverRefused, match="the graph it would replace has"):
        switchover.build_and_switch(live, _build(shrunk), say=lines.append)

    assert _count(live) == before == 13  # the old graph still serves under the live name
    assert names.prev not in _databases(live) and names.next in _databases(live)
    assert 0 < _count(names.next_url) < before  # the rejected build is there to inspect
    assert any("REFUSED" in line for line in lines) and not any("DONE" in line for line in lines)

    with pytest.raises(switchover.SwitchoverRefused, match="no Records loaded|no graph"):  # an archive with nothing in it never replaces a graph
        switchover.build_and_switch(live, _build(Archive(tmp_path / "empty")), say=lines.append)
    assert _count(live) == 13
    switchover.cleanup(live, lines.append)
    assert names.next not in _databases(live)


def test_the_first_build_into_an_empty_database_switches_over_without_a_previous_graph(live, tmp_path):
    names = switchover.names_of(live)
    switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)
    assert _count(live) == 13 and switchover._graph_counts(names.prev_url) is None  # the empty database that was live is the (empty) fallback


def test_the_api_keeps_answering_reads_while_the_shadow_graph_builds_and_across_the_switchover_but_an_in_place_rebuild_blocks_them(live, tmp_path, monkeypatch):
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    real = rebuild_module.load_records

    def slow(*a, **k):  # every file takes a moment: the build holds its locks for seconds, like the national one for hours
        time.sleep(0.4)
        return real(*a, **k)
    monkeypatch.setattr(rebuild_module, "load_records", slow)

    reads: list[tuple[float, float, int | None]] = []  # (start, seconds taken, count or None if the connection was refused)
    stop = threading.Event()

    def api():  # a reader like the API pool: its own connection per read, the way a reconnect after the swap would be
        while not stop.is_set():
            t = time.monotonic()
            try:
                with psycopg.connect(live, connect_timeout=2) as c:
                    n = c.execute("SELECT count(*) FROM seap.search WHERE doc @@@ 'a' OR doc @@@ 'e'").fetchone()[0], _count(live)
                reads.append((t, time.monotonic() - t, n[1]))
            except psycopg.Error:
                reads.append((t, time.monotonic() - t, None))
            time.sleep(0.02)

    reader = threading.Thread(target=api)
    reader.start()
    started = time.monotonic()
    try:
        switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)
    finally:
        time.sleep(0.5)
        stop.set()
        reader.join()
    build_seconds = time.monotonic() - started

    ok = [r for r in reads if r[2] is not None]
    assert build_seconds > 2 and len(ok) > 20  # a long build, answered all along
    assert max(r[1] for r in ok) < 1.0  # no read waited on the build's locks
    assert {r[2] for r in ok} == {6, 13}  # the old graph, then the new one: never a half-built one
    assert [r[2] for r in ok] == sorted(r[2] for r in ok)  # and once switched, never the old one again
    gaps = [b[0] - (a[0] + a[1]) for a, b in zip(ok, ok[1:])]
    assert max(gaps) < 2.0  # the switchover itself is a moment (refused connections), not a stall
    assert all(r[2] is None for r in reads if r not in ok)

    # the contrast: the same build in place holds an exclusive lock on the live tables, so a read waits (here: cancelled after 0.3 s)
    inplace = threading.Thread(target=lambda: rebuild(_archive(tmp_path, "again"), live))
    inplace.start()
    time.sleep(1.0)
    blocked = False
    try:
        with psycopg.connect(live, options="-c statement_timeout=300") as c:
            c.execute("SELECT count(*) FROM seap.record")
    except psycopg.errors.QueryCanceled:
        blocked = True
    inplace.join()
    assert blocked


def _mine(live: str) -> set[str]:
    return {d for d in _databases(live) if d.startswith(switchover.names_of(live).live)}


def test_a_rollback_with_a_session_open_on_the_fallback_still_ends_with_a_live_database(live, tmp_path):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)
    look = psycopg.connect(names.prev_url)  # the operator inspects the fallback, as the README invites
    try:
        switchover.rollback(live, lambda _: None)
    finally:
        look.close()
    assert _mine(live) == {names.live, names.prev} and _count(live) == 6 and _count(names.prev_url) == 13


def test_a_stop_between_the_two_renames_puts_the_old_graph_back(live, tmp_path, monkeypatch):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    real, calls = switchover._rename, []

    def stop_after_the_first_rename(admin, old, new):
        calls.append(old)
        if len(calls) == 2:
            raise SystemExit(143)  # SIGTERM, turned into SystemExit by the verb, right after <db> -> <db>_prev
        return real(admin, old, new)

    monkeypatch.setattr(switchover, "_rename", stop_after_the_first_rename)
    with pytest.raises(SystemExit):
        switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)
    monkeypatch.undo()
    assert names.live in _databases(live) and _count(live) == 6  # the API still has its graph
    assert names.next in _databases(live)  # and the checked new graph is kept


def test_a_swap_killed_between_the_renames_is_repaired_by_the_next_run_which_never_builds_without_a_live_database(live, tmp_path):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    with psycopg.connect(names.admin_url, autocommit=True) as admin:  # SIGKILL's leftover: <db> was renamed to <db>_prev, <db>_next is complete
        admin.execute(f'ALTER DATABASE "{names.live}" RENAME TO "{names.prev}"')
    seen = []

    def build(url, gate):
        seen.append(names.live in _databases(live))  # while the new graph builds, the live name must serve again
        return rebuild(_archive(tmp_path, "full"), url, gate=gate)

    lines = []
    switchover.build_and_switch(live, build, say=lines.append)
    assert seen == [True] and _count(live) == 13 and _count(names.prev_url) == 6
    assert any("repair" in line or "restor" in line for line in lines)
    assert names.next not in _databases(live)


def test_a_missing_live_database_fails_the_shrink_check_instead_of_skipping_it(live, tmp_path):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "full"), names.live_url)
    with psycopg.connect(names.admin_url, autocommit=True) as admin:
        admin.execute(f'CREATE DATABASE "{names.next}"')
    with psycopg.connect(names.next_url, autocommit=True) as c:
        c.execute("CREATE EXTENSION IF NOT EXISTS pg_search")
    rebuild(_archive(tmp_path, "full2"), names.next_url)
    failures = switchover.check_graph(names.next_url, against=switchover.make_conninfo(live, dbname="nonexistent_live"))
    assert any("does not exist" in f for f in failures)


def test_a_refused_graph_is_not_reported_as_finished_and_writes_no_outlines(live, tmp_path):
    from pipeline.progress import Progress, read_status

    rebuild(_archive(tmp_path, "full"), live)
    shrunk = _archive(tmp_path, "shrunk", drop=("seap/bulk/dan", "seap/bulk/da/2023Q1", "seap/bulk/da/2023Q2"))
    status_file, geo = tmp_path / "status.json", tmp_path / "geo"

    with pytest.raises(switchover.SwitchoverRefused):
        switchover.build_and_switch(live, lambda url, gate: rebuild(shrunk, url, Progress(status_file, out=lambda _: None), geo_dir=geo, gate=gate), say=lambda _: None)

    status = read_status(status_file)
    assert status["state"] == "failed" and "SwitchoverRefused" in status["error"]  # `pipeline status` must not call the refused graph finished
    assert not geo.exists()  # the served outlines are untouched


def _accepts_connections(url: str) -> bool:
    try:
        with psycopg.connect(url, connect_timeout=5):
            return True
    except psycopg.OperationalError:
        return False


def test_a_stop_inside_the_first_rename_leaves_the_live_database_accepting_connections(live, tmp_path, monkeypatch):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    real = psycopg.Connection.execute

    def stop_when_terminating_the_live_sessions(self, query, params=None, **kw):
        if isinstance(query, str) and "pg_terminate_backend" in query and params == (names.live,):
            raise SystemExit(143)  # SIGTERM after `ALLOW_CONNECTIONS false`, before the rename
        return real(self, query, params, **kw)

    monkeypatch.setattr(psycopg.Connection, "execute", stop_when_terminating_the_live_sessions)
    with pytest.raises(SystemExit):
        switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)
    monkeypatch.undo()
    assert _accepts_connections(live) and _count(live) == 6  # the API is not left refused


def test_a_live_database_left_refusing_connections_by_a_kill_is_repaired_and_a_refused_check_does_not_claim_it_serves(live, tmp_path):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    with psycopg.connect(names.admin_url, autocommit=True) as admin:  # SIGKILL's leftover: after `ALLOW_CONNECTIONS false`, or after the second rename
        admin.execute(f'ALTER DATABASE "{names.live}" WITH ALLOW_CONNECTIONS false')
    assert not _accepts_connections(live)
    lines = []
    assert switchover.recover(names, lines.append) is True
    assert _accepts_connections(live) and _count(live) == 6
    assert any("REPAIR" in line for line in lines)
    assert switchover.recover(names, lines.append) is False  # nothing left to repair


def test_a_rollback_killed_before_its_last_rename_is_finished_by_the_next_run_and_cleanup_drops_the_swap_copy(live, tmp_path):
    names = switchover.names_of(live)
    swap = names.live + switchover.SWAP
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    switchover.build_and_switch(live, _build(_archive(tmp_path, "full")), say=lambda _: None)  # live 13, prev 6
    with psycopg.connect(names.admin_url, autocommit=True) as admin:  # a rollback killed after its second rename
        admin.execute(f'ALTER DATABASE "{names.live}" RENAME TO "{swap}"')
        admin.execute(f'ALTER DATABASE "{names.prev}" RENAME TO "{names.live}"')
        admin.execute(f'ALTER DATABASE "{names.live}" WITH ALLOW_CONNECTIONS false')
    assert switchover.recover(names, lambda _: None) is True
    assert _mine(live) == {names.live, names.prev} and _count(live) == 6 and _count(names.prev_url) == 13  # the rollback is complete

    with psycopg.connect(names.admin_url, autocommit=True) as admin:  # an orphan beside a fallback that is already there
        admin.execute(f'CREATE DATABASE "{swap}"')
    assert set(switchover.cleanup(live, lambda _: None)) == {names.prev, swap}
