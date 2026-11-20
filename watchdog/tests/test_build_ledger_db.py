"""The build ledger and the staged build (ticket #291, spec #285), through `rebuild` / the Switchover and the graph. Needs Docker (the container fixture of
test_bulk_loader_db.py); skipped without it."""
import shutil
import time
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from graph_dump import GRAPH_SCHEMAS, dump_graph  # noqa: E402
from pipeline import build_steps as build_steps_module  # noqa: E402
from pipeline import switchover  # noqa: E402
from pipeline.archive import Archive  # noqa: E402
from pipeline.build_steps import STEPS, reset_identity  # noqa: E402
from pipeline.rebuild import rebuild  # noqa: E402
from test_bulk_loader_db import FIXTURE, db, server  # noqa: E402,F401
from test_switchover_db import _archive, _count, _databases, live  # noqa: E402,F401

ONRC_ARCHIVE = Path(__file__).parent / "fixtures" / "archive-onrc-search"
NAMES = [s.name for s in STEPS]
WITHOUT_BUILD = tuple(s for s in GRAPH_SCHEMAS if s != "build")


def _new_db(server, label: str) -> str:
    name = f"{label}{time.time_ns()}"
    with psycopg.connect(f"{server}/postgres", autocommit=True) as c:
        c.execute(f'CREATE DATABASE "{name}"')
    return f"{server}/{name}"


def _ledger(url: str):
    with psycopg.connect(url) as c:
        run = c.execute("SELECT state, staged, ended IS NOT NULL FROM build.run").fetchall()
        steps = c.execute("SELECT name, ordinal, started IS NOT NULL AND ended >= started FROM build.step ORDER BY ordinal").fetchall()
    return run, steps


def _staged(archive: Archive):
    return lambda url, gate: rebuild(archive, url, gate=gate, staged=True)


def test_a_beside_build_commits_after_each_step_and_the_ledger_shows_each_completed_step(live, tmp_path):
    switchover.build_and_switch(live, _staged(_archive(tmp_path, "full")), say=lambda _: None)
    run, steps = _ledger(live)
    assert run == [("complete", True, True)]
    assert steps == [(name, i, True) for i, name in enumerate(NAMES)]


def test_an_in_place_build_is_one_transaction_and_writes_the_same_ledger(db, tmp_path):
    rebuild(_archive(tmp_path, "full"), db)
    run, steps = _ledger(db)
    assert run == [("complete", False, True)] and [s[0] for s in steps] == NAMES


@pytest.mark.parametrize("killed_by", [RuntimeError("connection lost"), SystemExit(143)])
def test_an_interrupted_beside_build_keeps_its_earlier_steps_committed_beside_an_untouched_live_graph_and_a_rerun_builds_and_swaps(live, tmp_path, monkeypatch, killed_by):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    before = dump_graph(live)
    real = build_steps_module.build_rollup
    monkeypatch.setattr(build_steps_module, "build_rollup", lambda cur: (_ for _ in ()).throw(killed_by))
    full = _archive(tmp_path, "full")
    with pytest.raises(type(killed_by)):
        switchover.build_and_switch(live, _staged(full), say=lambda _: None)

    assert dump_graph(live) == before  # the served graph is untouched and serving
    assert names.next in _databases(live)
    run, steps = _ledger(names.next_url)  # the Steps before the rollup are committed there, the build is not complete
    assert run == [("building", True, False)]
    assert [s[0] for s in steps] == NAMES[:NAMES.index("rollup")]
    assert _count(names.next_url) == 13
    assert any("not complete" in f for f in switchover.check_graph(names.next_url, against=live))

    monkeypatch.setattr(build_steps_module, "build_rollup", real)
    switchover.build_and_switch(live, _staged(full), say=lambda _: None)  # drops the partial database, rebuilds, swaps
    assert _count(live) == 13 and names.next not in _databases(live)
    assert _ledger(live)[0] == [("complete", True, True)]


@pytest.mark.parametrize("tamper", [
    "UPDATE build.run SET state = 'building'",
    "DELETE FROM build.step WHERE name = 'rollup'",
    "DROP SCHEMA build CASCADE",
], ids=["state-not-complete", "a-step-row-missing", "no-ledger-at-all"])
def test_a_switchover_never_swaps_in_a_next_database_whose_ledger_is_not_complete(live, tmp_path, tamper):
    names = switchover.names_of(live)
    rebuild(_archive(tmp_path, "old", drop=("seap/bulk/dan",)), live)
    before = dump_graph(live)

    def build(url, gate):
        result = rebuild(_archive(tmp_path, "full"), url, staged=True)
        with psycopg.connect(url, autocommit=True) as c:
            c.execute(tamper)
        return result

    lines = []
    with pytest.raises(switchover.SwitchoverRefused):
        switchover.build_and_switch(live, build, say=lines.append)
    assert dump_graph(live) == before and names.next in _databases(live) and names.prev not in _databases(live)
    assert any("CHECK FAILED" in line and ("ledger" in line or "not complete" in line) for line in lines), lines


@pytest.mark.parametrize("fixture", [FIXTURE, ONRC_ARCHIVE], ids=["bulk", "onrc"])
def test_a_staged_build_leaves_the_same_graph_as_the_single_transaction_one_apart_from_the_build_schema(server, tmp_path, fixture):
    for name in ("single", "staged"):  # one archive each: a build moves the files it sets aside, so a second build would read a settled one
        shutil.copytree(fixture, tmp_path / name)
    single, staged = _new_db(server, "single"), _new_db(server, "staged")
    rebuild(Archive(tmp_path / "single"), single)
    rebuild(Archive(tmp_path / "staged"), staged, staged=True)
    assert dump_graph(staged, WITHOUT_BUILD) == dump_graph(single, WITHOUT_BUILD)
    assert dump_graph(staged, ("build",))["build.step"] == dump_graph(single, ("build",))["build.step"]  # same hand-offs; only build.run differs (staged)


def test_a_step_that_inserts_into_an_identity_column_resets_its_sequence_from_the_committed_maximum(db, tmp_path):
    rebuild(_archive(tmp_path, "full"), db, staged=True)
    with psycopg.connect(db, autocommit=True) as c:
        top = c.execute("SELECT max(id) FROM seap.search").fetchone()[0]
        for _ in range(7):  # an attempt that rolled back still used up ids: sequences are not transactional
            c.execute("SELECT nextval(pg_get_serial_sequence('seap.search', 'id'))")
        reset_identity(c.cursor(), "seap.search")
        assert c.execute("SELECT nextval(pg_get_serial_sequence('seap.search', 'id'))").fetchone()[0] == top + 1
