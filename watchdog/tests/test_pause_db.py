"""Pause and resume of a staged rebuild (ticket #296, spec #285), through `pipeline rebuild` and `pipeline refresh` over a miniature Raw archive into a throwaway
ParadeDB, and through `pipeline status` and the graph. The stop file and the deadline are driven in-process through `cli.main` (resume_harness.py); the signals
are real, sent to a subprocess this test starts and stops by PID. Needs Docker (the container fixture of test_bulk_loader_db.py)."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")

from pipeline import cli, switchover  # noqa: E402
from pipeline.onrc.people import SECRET_ENV  # noqa: E402
from pipeline.progress import read_status  # noqa: E402
from pipeline.refresh import Ledger  # noqa: E402
from pipeline.stop import PAUSED_EXIT_CODE, STOP_FILE  # noqa: E402
from resume_harness import FIXTURES, Harness, make_world, onrc_snapshot_pause_point, step_pause_points, unit_pause_point  # noqa: E402
from test_bulk_loader_db import server  # noqa: E402,F401
from test_resume_db import IN_PLACE_STAGED, SMALL, _refresh_load, _stub_impl, onrc_rows  # noqa: E402
from test_refresh import Pings  # noqa: E402

STEP_POINTS = {p.name: p for p in step_pause_points()}
WATCHDOG = Path(__file__).resolve().parents[1]


@pytest.fixture
def harness(server, tmp_path, monkeypatch, capsys):
    return Harness(server, tmp_path, monkeypatch, capsys)


def _next(live: str) -> str:
    return switchover.names_of(live).next_url


def _status(h: Harness, archive: Path, capsys) -> tuple[int, str]:
    capsys.readouterr()
    code = cli.main(["--archive", str(archive), "status", "--progress-file", str(h.tmp / "status.json")])
    return code, capsys.readouterr().out


# --- the stop file ------------------------------------------------------------------------------------------------------------------------------------

@pytest.mark.parametrize("name", ["pause-after-step-schema", "pause-after-step-units", "pause-after-step-entities", "pause-after-step-onrc-search"])
def test_a_stop_file_pauses_a_beside_build_at_the_next_step_and_a_rerun_leaves_the_uninterrupted_graph(harness, name):
    harness.assert_pause_resumes_like_reference(STEP_POINTS[name])


def test_a_stop_file_pauses_in_the_middle_of_the_unit_loop(harness):
    paused, _ = harness.assert_pause_resumes_like_reference(unit_pause_point(3))
    assert "units committed" in paused.out[-1] and "3/" in paused.out[-1]


def test_a_stop_file_pauses_between_onrc_snapshots(harness):
    harness.assert_pause_resumes_like_reference(onrc_snapshot_pause_point(2))


def test_the_matrix_pauses_after_every_step_but_the_last():
    from pipeline.build_steps import STEPS
    assert list(STEP_POINTS) == [f"pause-after-step-{s.name}" for s in STEPS[:-1]]


def test_a_paused_beside_build_says_so_in_the_ledger_the_progress_file_and_pipeline_status(harness, server, capsys):
    archive, live = harness.new_archive("status"), harness.new_live()
    paused = harness.run(archive, live, pause=unit_pause_point(3))
    with psycopg.connect(_next(live)) as c:
        assert c.execute("SELECT state FROM build.run").fetchone() == ("paused",)
        assert c.execute("SELECT count(*) FROM build.unit").fetchone() == (3,)
    status = read_status(harness.tmp / "status.json")
    assert status["state"] == "paused" and status["reached"].startswith("after unit 3/")
    assert "rebuild PAUSED after unit 3/" in paused.out[-1]
    code, text = _status(harness, archive, capsys)
    assert code == 0  # a pause somebody asked for is not a failure
    assert "state: paused" in text and "after unit 3/" in text and "rerun the same command to resume" in text
    assert f"{live.rsplit('/', 1)[1]}_next holds a full extra copy of the graph on disk" in text
    with psycopg.connect(live) as c:  # nothing switched: the live database is still empty
        assert c.execute("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'seap'").fetchone() == (0,)
    resumed = harness.run(archive, live)
    assert resumed.first.startswith("rebuild: resume - ")
    with psycopg.connect(live) as c:
        assert c.execute("SELECT state FROM build.run").fetchone() == ("complete",)
    assert _status(harness, archive, capsys)[1].count("state: finished") == 1


def test_an_in_place_staged_build_pauses_and_names_the_target_database_not_an_extra_copy(harness, capsys):
    archive, live = harness.new_archive("inplace"), harness.new_live()
    paused = harness.run(archive, live, *IN_PLACE_STAGED, pause=STEP_POINTS["pause-after-step-entities"])
    assert "after step entities" in paused.err
    with psycopg.connect(live) as c:
        assert c.execute("SELECT state FROM build.run").fetchone() == ("paused",)
    code, text = _status(harness, archive, capsys)
    name = live.rsplit("/", 1)[1]
    assert code == 0 and "state: paused" in text and "after step entities" in text
    assert f"the database is {name}" in text and "full extra copy" not in text
    ref = harness.reference()
    rerun = harness.run(archive, live, *IN_PLACE_STAGED)
    assert rerun.first.startswith("rebuild: resume - ") and rerun.graph == ref.graph


def test_a_plain_in_place_build_has_no_boundary_so_the_stop_file_is_ignored_and_the_build_completes(harness):
    ref = harness.reference()
    archive, live = harness.new_archive("plain"), harness.new_live()
    (archive / STOP_FILE).touch()
    out = harness.run(archive, live, "--in-place")  # asserts exit 0
    assert not (archive / STOP_FILE).exists() and out.graph is not None  # ignored by the build, removed when it finished: it never pauses a later build by surprise
    with psycopg.connect(live) as c:
        assert c.execute("SELECT state FROM build.run").fetchone() == ("complete",)


def test_a_stop_file_left_before_the_run_pauses_it_at_the_first_boundary_and_is_consumed(harness):
    archive, live = harness.new_archive("early"), harness.new_live()
    (archive / STOP_FILE).touch()
    harness.capsys.readouterr()
    assert cli.main(harness.args(archive, live)) == PAUSED_EXIT_CODE
    assert not (archive / STOP_FILE).exists()
    assert "after step schema" in harness.capsys.readouterr().err
    assert harness.run(archive, live).first.startswith("rebuild: resume - ")


# --- a request after the last boundary ---------------------------------------------------------------------------------------------------------------------

def _touch_stop_file_in_last_step(monkeypatch, archive: Path) -> None:
    import pipeline.build_steps as build_steps
    real, last = build_steps.write_step, build_steps.STEPS[-1].name

    def write_step(cur, name, ordinal, summary):
        if name == last:
            (archive / STOP_FILE).touch()  # the last Step is running: no boundary follows it
        return real(cur, name, ordinal, summary)
    monkeypatch.setattr(build_steps, "write_step", write_step)


def test_a_stop_file_touched_during_the_last_step_is_consumed_and_the_build_completes_and_switches(harness, monkeypatch):
    ref = harness.reference()
    archive, live = harness.new_archive("last-file"), harness.new_live()
    with monkeypatch.context() as m:
        _touch_stop_file_in_last_step(m, archive)
        out = harness.run(archive, live)  # exit 0: a finished build is complete, not paused
    assert not (archive / STOP_FILE).exists() and out.graph == ref.graph


# --- the deadline -------------------------------------------------------------------------------------------------------------------------------------

def test_the_deadline_pauses_the_build_when_reached_and_a_rerun_without_it_resumes_to_the_same_graph(harness, monkeypatch):
    ref = harness.reference()
    archive, live = harness.new_archive("deadline"), harness.new_live()
    import pipeline.stop as stop
    clock = {"now": 0.0}
    real_configure = stop.STOP.configure
    monkeypatch.setattr(stop.STOP, "configure", lambda root, pause_after, clock_fn=None: real_configure(root, pause_after, clock=lambda: clock["now"]))
    seen = []
    import pipeline.build_steps as build_steps
    real = build_steps.write_step

    def write_step(cur, name, ordinal, summary):
        real(cur, name, ordinal, summary)
        if name == "units":
            clock["now"] = 100.0 * 60  # the build has now run a hundred minutes
            seen.append(name)
    monkeypatch.setattr(build_steps, "write_step", write_step)
    harness.capsys.readouterr()
    assert cli.main(harness.args(archive, live, "--pause-after", "90m")) == PAUSED_EXIT_CODE
    err = harness.capsys.readouterr().err
    assert "after step units" in err and "--pause-after deadline" in err
    monkeypatch.undo()
    rerun = harness.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - ") and rerun.graph == ref.graph


def test_there_is_no_deadline_unless_asked_for(harness, monkeypatch):
    import pipeline.stop as stop
    archive, live = harness.new_archive("nodeadline"), harness.new_live()
    monkeypatch.setattr(stop.time, "monotonic", lambda: 10.0 ** 9)  # however late it is
    out = harness.run(archive, live)  # asserts exit 0: never paused
    assert out.graph is not None


def test_pause_after_is_a_parser_error_for_a_plain_in_place_build_and_for_a_bad_duration(harness, capsys):
    archive, live = harness.new_archive("parser"), harness.new_live()
    for extra, message in ((("--in-place", "--pause-after", "1h"), "nothing to pause at"), (("--pause-after", "soon"), "not a duration")):
        with pytest.raises(SystemExit) as e:
            cli.main(harness.args(archive, live, *extra))
        assert e.value.code == 2 and message in capsys.readouterr().err


# --- real signals, in a subprocess this test starts and stops by PID ----------------------------------------------------------------------------------------

DRIVER = """
import os, sys, time
import pipeline.build_steps as build_steps
import pipeline.stop as stop
from pipeline import cli

real = build_steps.write_step
def write_step(cur, name, ordinal, summary):
    if name == os.environ["SLOW_STEP"]:  # inside the Step's transaction, before its ledger row: the Step in progress
        print("SLOW-STEP " + name, flush=True)
        end = time.time() + 120
        while time.time() < end and not (os.environ["SLOW_UNTIL"] == "stop" and stop.STOP.requested):
            time.sleep(0.05)
    return real(cur, name, ordinal, summary)
build_steps.write_step = write_step
sys.exit(cli.main(sys.argv[1:]))
"""


def _start(harness, tmp_path, archive, live, slow_step: str, until: str):
    script = tmp_path / "driver" / "driver.py"
    script.parent.mkdir(exist_ok=True)
    script.write_text(DRIVER)
    env = {**os.environ, "SLOW_STEP": slow_step, "SLOW_UNTIL": until, SECRET_ENV: "dummy-secret-for-tests-only-0123456789", "PYTHONPATH": str(WATCHDOG)}
    env.pop("DATABASE_URL", None)
    return subprocess.Popen([sys.executable, str(script), *harness.args(archive, live)], cwd=WATCHDOG, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def _wait_for(proc, text: str, lines: list[str]) -> None:
    deadline = time.time() + 300
    for line in proc.stdout:
        lines.append(line.rstrip())
        if text in line:
            return
        assert time.time() < deadline
    raise AssertionError(f"the process ended without {text!r}: {lines[-5:]}")


def test_a_first_sigterm_pauses_the_build_at_the_next_boundary_and_a_rerun_resumes_it(harness, tmp_path, capsys):
    ref = harness.reference()
    archive, live = harness.new_archive("sigterm1"), harness.new_live()
    proc, lines = _start(harness, tmp_path, archive, live, "entities", "stop"), []
    try:
        _wait_for(proc, "SLOW-STEP entities", lines)
        proc.send_signal(signal.SIGTERM)
        lines += proc.communicate(timeout=300)[0].splitlines()
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()
    text = "\n".join(lines)
    assert proc.returncode == PAUSED_EXIT_CODE, text
    assert "stop requested: pausing at the next boundary" in text and "paused after step entities" in text
    assert "Traceback" not in text
    with psycopg.connect(_next(live)) as c:  # the Step in hand finished and committed before the pause
        assert c.execute("SELECT state FROM build.run").fetchone() == ("paused",)
        assert c.execute("SELECT count(*) FROM build.step WHERE name = 'entities'").fetchone() == (1,)
    assert _status(harness, archive, capsys)[0] == 0
    rerun = harness.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - ") and rerun.graph == ref.graph


def test_a_second_sigterm_aborts_only_the_step_in_progress_and_the_earlier_steps_are_kept(harness, tmp_path, capsys):
    ref = harness.reference()
    archive, live = harness.new_archive("sigterm2"), harness.new_live()
    proc, lines = _start(harness, tmp_path, archive, live, "entities", "never"), []
    try:
        _wait_for(proc, "SLOW-STEP entities", lines)
        proc.send_signal(signal.SIGTERM)
        _wait_for(proc, "stop requested", lines)  # the first one is only a request: the Step goes on
        assert proc.poll() is None
        proc.send_signal(signal.SIGTERM)
        lines += proc.communicate(timeout=300)[0].splitlines()
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()
    assert proc.returncode == 143, lines
    with psycopg.connect(_next(live)) as c:
        names = [r[0] for r in c.execute("SELECT name FROM build.step ORDER BY ordinal")]
        assert c.execute("SELECT state FROM build.run").fetchone() == ("building",)  # not paused: it was cut off
    assert names[-1] == "frameworks" and "entities" not in names  # the Steps before the one in progress are committed
    code, text = _status(harness, archive, capsys)
    assert code == 1 and "state: interrupted (resumable)" in text and "last committed Step is frameworks" in text
    rerun = harness.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - ") and rerun.graph == ref.graph


def test_a_first_sigterm_during_the_last_step_completes_the_build_and_exits_0_with_a_log_line(harness, tmp_path):
    from pipeline.build_steps import STEPS
    ref = harness.reference()
    archive, live = harness.new_archive("sigterm-last"), harness.new_live()
    proc, lines = _start(harness, tmp_path, archive, live, STEPS[-1].name, "stop"), []
    try:
        _wait_for(proc, f"SLOW-STEP {STEPS[-1].name}", lines)
        proc.send_signal(signal.SIGTERM)
        lines += proc.communicate(timeout=300)[0].splitlines()
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()
    text = "\n".join(lines)
    assert proc.returncode == 0, text  # no boundary to pause at, and a finished build is not thrown away
    assert "stop requested after the last boundary: the build is complete; stopping after it" in text and "Traceback" not in text
    from resume_harness import dump_graph
    assert dump_graph(live) == ref.graph  # switched over: the live database holds the finished graph


# --- the refresh run -----------------------------------------------------------------------------------------------------------------------------------

def test_a_refresh_whose_load_pauses_records_paused_in_the_ledger_pings_log_and_the_next_trigger_resumes_it(server, tmp_path, monkeypatch, capsys):
    h = Harness(server, tmp_path, monkeypatch, capsys, world=SMALL)
    archive, live = h.new_archive("refresh"), h.new_live()
    ref = h.reference()
    pings = Pings()
    monkeypatch.setattr("pipeline.refresh.pings.requests.post", pings)
    monkeypatch.setattr(cli, "_impl", lambda a, args: _stub_impl(a, cli._loader(a, args)))
    argv = ["--archive", str(archive), "refresh", *h.args(archive, live)[3:], "--healthcheck-url", "https://hc.example/p", "--trigger", "timer"]
    previous = signal.getsignal(signal.SIGTERM)
    try:
        with monkeypatch.context() as m:
            unit_pause_point(3).arm(m, archive)
            code = cli.main(argv)
        assert code == 0  # not a failure: alerting is the ping's job
        run = Ledger(archive / "refresh-ledger.json").runs[-1]
        assert run["status"] == "paused" and [(s["name"], s["status"]) for s in run["steps"]][-1] == ("load", "paused")  # the backups after it did not start
        assert "after unit 3/" in run["steps"][-1]["note"]
        assert pings.urls == ["https://hc.example/p/log"]  # neither the success ping (resets the dead-man's switch) nor /fail (pages)
        assert "refresh paused: load paused after unit 3/" in pings.calls[0][1]
        assert f"{live.rsplit('/', 1)[1]}_next holds a full extra copy of the graph on disk" in pings.calls[0][1]  # D9: names the database
        assert run["steps"][-1]["database"] == f"{live.rsplit('/', 1)[1]}_next"
        assert Ledger(archive / "refresh-ledger.json").consecutive_failed_runs() == 0
        code, text = _status(h, archive, capsys)
        assert "paused" in text and "not a failure" in text
        night2 = cli.main(argv)  # the next trigger: the load is still due and resumes the paused build
    finally:
        signal.signal(signal.SIGTERM, previous)
    assert night2 == 0
    ledger = Ledger(archive / "refresh-ledger.json")
    assert [(s["name"], s["status"]) for s in ledger.runs[-1]["steps"]][0] == ("load", "ok") and ledger.runs[-1]["status"] == "ok"
    assert pings.urls[-1] == "https://hc.example/p"  # now the success ping
    with psycopg.connect(live) as c:
        assert c.execute("SELECT state FROM build.run").fetchone() == ("complete",)
    assert onrc_rows(live, "SELECT count(*) FROM seap.record") == onrc_rows(ref.url, "SELECT count(*) FROM seap.record")


# --- the step reached after a resume (N6) and a code change confined to a later Step (N7) ----------------------------------------------------------------

def test_a_resumed_build_that_pauses_again_names_the_step_the_earlier_run_committed(harness, capsys):
    archive, live = harness.new_archive("resume-reached"), harness.new_live()
    harness.run(archive, live, pause=STEP_POINTS["pause-after-step-estimates"])
    second = harness.run(archive, live, pause=unit_pause_point(3))  # the resumed run pauses in the unit loop, before it commits a Step of its own
    assert second.first.startswith("rebuild: resume - ")
    assert read_status(harness.tmp / "status.json")["committed"] == "estimates"
    code, text = _status(harness, archive, capsys)
    assert code == 0 and "last committed Step is estimates" in text


def test_a_pause_then_a_code_change_confined_to_a_later_step_resumes_with_the_new_code_and_equals_the_reference(harness, tmp_path, monkeypatch):
    import pipeline.pins as pins_module
    from resume_harness import copy_package, edit_code
    harness.reference()
    package = copy_package(tmp_path / "code" / "elsewhere" / "pipeline")
    monkeypatch.setattr(pins_module, "PACKAGE", package)
    archive, live = harness.new_archive("pause-code"), harness.new_live()
    harness.run(archive, live, pause=STEP_POINTS["pause-after-step-analyze-search"])
    edit_code(package, "onrc/search.py")  # the onrc-search Step's own file: not run yet
    rerun = harness.run(archive, live)
    assert rerun.first.startswith("rebuild: resume - ") and "code changed only in Steps not yet run: onrc/search.py" in rerun.first
    ref = harness.run(harness.new_archive("pause-code-ref"), harness.new_live())  # the same edited package, never paused
    strip = lambda g: {**g, "build.run": [{k: v for k, v in row.items() if k != "changed_files"} for row in g["build.run"]]}  # noqa: E731
    assert strip(rerun.graph) == strip(ref.graph)
    assert rerun.graph["build.run"][0]["changed_files"] == ["onrc/search.py"]
