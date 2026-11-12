"""Progress of a long rebuild (ticket #64): timestamped per-unit lines, the status file, `pipeline status`.
No database here (the lines and the status file of a real rebuild are checked in test_bulk_loader_db.py)."""
import json
import os
import re
from datetime import datetime, timedelta, timezone

import pytest

from pipeline import progress as progress_module
from pipeline.cli import main
from pipeline.progress import Progress, describe, effective_state, read_status, write_atomically


class Clock:
    def __init__(self):
        self.t = datetime(2026, 11, 12, 10, 0, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.t

    def tick(self, seconds):
        self.t += timedelta(seconds=seconds)


@pytest.fixture
def run(tmp_path):
    clock, lines = Clock(), []
    status_file = tmp_path / "state" / "rebuild-progress.json"
    p = Progress(status_file, out=lines.append, now=clock)
    return p, clock, lines, status_file


TS = r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4}"


def test_each_unit_gets_one_timestamped_line_and_a_final_summary(run):
    p, clock, lines, _ = run
    p.start(3, "/archive")
    p.begin(1, 3, "contracte", "2023Q2")
    clock.tick(41.2)
    p.unit_done(1, 3, "contracte", "2023Q2", files=1, rows=124000, records=98000, outcome="loaded")
    p.begin(2, 3, "dan", "2024Q1")
    p.unit_done(2, 3, "dan", "2024Q1", files=1, rows=0, records=0, outcome="skipped", reason="same file already loaded")
    p.begin(3, 3, "da", "2023Q2")
    p.unit_done(3, 3, "da", "2023Q2", files=1, rows=7, records=0, outcome="quarantined", reason="headers do not match a DA file")
    clock.tick(3600)
    p.finish(98000)
    assert re.fullmatch(rf"{TS} rebuild start units=3 archive=/archive pid=\d+", lines[0])
    assert re.fullmatch(rf"{TS} rebuild unit 1/3 kind=contracte unit=2023Q2 files=1 rows=124000 records=98000 loaded in 41\.2s", lines[1])
    assert re.fullmatch(rf"{TS} rebuild unit 2/3 kind=dan unit=2024Q1 files=1 rows=0 records=0 skipped \(same file already loaded\)", lines[2])
    assert re.fullmatch(rf"{TS} rebuild unit 3/3 kind=da unit=2023Q2 files=1 rows=7 records=0 quarantined \(headers do not match a DA file\)", lines[3])
    assert re.fullmatch(rf"{TS} rebuild done units=3 loaded=1 skipped=1 quarantined=1 records=98000 in 1:00:41", lines[4])
    assert len(lines) == 5  # nothing else: no per-row noise, no progress bar


def test_the_status_file_follows_the_run_and_is_replaced_atomically(run):
    p, clock, lines, status_file = run
    p.start(2, "/archive")
    assert read_status(status_file)["state"] == "running" and read_status(status_file)["total"] == 2
    p.begin(1, 2, "contracte", "2022Q1")
    assert read_status(status_file)["current"] == {"index": 1, "kind": "contracte", "unit": "2022Q1"}  # visible while the unit runs
    p.unit_done(1, 2, "contracte", "2022Q1", 1, 10, 5, "loaded")
    s = read_status(status_file)
    assert (s["done"], s["total"], s["loaded"], s["records"], s["current"]) == (1, 2, 1, 5, None) and s["last"] == lines[-1]
    p.begin(2, 2, "dan", "2022Q1")
    p.unit_done(2, 2, "dan", "2022Q1", 1, 3, 3, "loaded")
    p.finish(8)
    s = read_status(status_file)
    assert (s["state"], s["done"], s["records"], s["pid"]) == ("finished", 2, 8, os.getpid())
    assert sorted(x.name for x in status_file.parent.iterdir()) == ["rebuild-progress.json"]  # no temp file left behind


def test_the_status_file_is_written_to_a_temporary_name_and_renamed(tmp_path, monkeypatch):
    target = tmp_path / "s.json"
    target.write_text('{"old": true}')
    seen = []
    real = os.replace

    def spy(src, dst):
        seen.append((os.path.basename(src), json.loads(target.read_text()), json.loads(open(src).read())))  # before the swap
        real(src, dst)

    monkeypatch.setattr(progress_module.os, "replace", spy)
    write_atomically(target, '{"new": true}')
    [(tmp_name, visible, staged)] = seen
    assert tmp_name != "s.json" and tmp_name.endswith(".tmp")
    assert visible == {"old": True} and staged == {"new": True}  # a reader sees the old file until the rename, never a half-written one
    assert json.loads(target.read_text()) == {"new": True}


def test_a_failure_is_reported_and_says_to_rerun_from_scratch(run):
    p, _, lines, status_file = run
    p.start(5, "/archive")
    p.begin(1, 5, "dan", "2024Q1")
    p.unit_done(1, 5, "dan", "2024Q1", 1, 3, 3, "loaded")
    p.fail(RuntimeError("connection lost"))
    assert re.fullmatch(rf"{TS} rebuild FAILED after 1/5 units: RuntimeError: connection lost; nothing was loaded, rerun from scratch", lines[-1])
    s = read_status(status_file)
    assert s["state"] == "failed" and s["error"] == "RuntimeError: connection lost"


def test_a_failure_after_the_load_finished_does_not_overwrite_the_finished_state(run):
    p, _, _, status_file = run
    p.start(1, "/archive")
    p.finish(5)
    p.fail(KeyboardInterrupt())
    assert json.loads(status_file.read_text())["state"] == "finished"


def test_status_says_whether_a_rebuild_is_running_finished_or_was_killed(run):
    p, clock, lines, status_file = run
    p.start(4, "/archive")
    p.begin(2, 4, "contracte", "2024Q2")
    status = read_status(status_file)
    assert effective_state(status, alive=lambda pid: True) == "running"
    text = "\n".join(describe(status, alive=lambda pid: True))
    assert "state: running" in text and "units: 0/4 done" in text and "now: unit 2/4 kind=contracte unit=2024Q2" in text
    # the process is gone but never wrote `finished`: it was killed
    assert effective_state(status, alive=lambda pid: False) == "interrupted"
    gone = "\n".join(describe(status, alive=lambda pid: False))
    assert "state: interrupted" in gone and "rerun the same command" in gone
    p.finish(0)
    assert effective_state(read_status(status_file), alive=lambda pid: False) == "finished"


def test_the_status_command_reads_the_file(run, capsys, tmp_path):
    p, _, _, status_file = run
    assert main(["--archive", str(tmp_path), "status", "--progress-file", str(tmp_path / "missing.json")]) == 1
    assert "no rebuild status" in capsys.readouterr().out
    p.start(2, "/archive")
    p.begin(1, 2, "da", "2022Q1")
    p.unit_done(1, 2, "da", "2022Q1", 1, 9, 9, "loaded")
    assert main(["--archive", str(tmp_path), "status", "--progress-file", str(status_file)]) == 0  # this process is alive: it wrote the file
    out = capsys.readouterr().out
    assert "state: running" in out and "units: 1/2 done (1 loaded, 0 skipped, 0 quarantined)" in out and "records loaded so far: 9" in out
    p.fail(RuntimeError("x"))
    assert main(["--archive", str(tmp_path), "status", "--progress-file", str(status_file)]) == 1
    assert "state: failed" in capsys.readouterr().out


def test_the_status_file_defaults_to_the_archive_root(tmp_path, capsys):
    assert main(["--archive", str(tmp_path), "status"]) == 1
    assert str(tmp_path / "rebuild-progress.json") in capsys.readouterr().out


def test_sigterm_ends_the_rebuild_command_like_a_failure(tmp_path):
    """`pkill -f 'pipeline rebuild'` must unwind (so the transaction rolls back and the status file says failed), not die mid-air."""
    import signal
    import subprocess
    import sys
    import time
    from pathlib import Path

    watchdog = Path(__file__).resolve().parents[1]
    script = (
        "import sys, time\n"
        "import pipeline.cli as cli\n"
        "def slow(archive, db, progress, **kw):\n"
        "    progress.start(1, archive.root)\n"
        "    try:\n"
        "        time.sleep(60)\n"
        "    except BaseException as e:\n"
        "        progress.fail(e)\n"
        "        raise\n"
        "cli.rebuild = slow\n"
        "sys.exit(cli.main(['--archive', sys.argv[1], 'rebuild', '--in-place', '--db', 'postgresql://unused']))\n"
    )
    status_file = tmp_path / "rebuild-progress.json"
    proc = subprocess.Popen([sys.executable, "-c", script, str(tmp_path)], cwd=watchdog, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    deadline = time.time() + 20
    while not status_file.exists():
        assert time.time() < deadline and proc.poll() is None, "the rebuild never started"
        time.sleep(0.05)
    proc.send_signal(signal.SIGTERM)
    out, err = proc.communicate(timeout=20)
    assert proc.returncode == 143 and "Traceback" not in err
    assert read_status(status_file)["state"] == "failed" and "rebuild FAILED" in out
    assert effective_state(read_status(status_file)) == "failed"


def test_a_running_file_from_another_host_is_not_judged_by_its_pid(run):
    p, _, _, status_file = run
    p.start(4, "/archive")
    p.begin(2, 4, "contracte", "2024Q2")
    status = read_status(status_file)
    assert status["host"]
    # the pid exists here (a fresh container's python is pid 1) but the file is from another host: cannot tell
    assert effective_state(status, alive=lambda pid: True, host="another-container") == "unknown"
    assert effective_state(status, alive=lambda pid: False, host="another-container") == "unknown"
    text = "\n".join(describe(status, alive=lambda pid: True, host="another-container", now=datetime.fromisoformat(status["updatedAt"].replace("Z", "+00:00")) + timedelta(hours=2)))
    assert "running? (cannot see the process from here)" in text and "last update 2:" in text and "now: unit 2/4" in text
    # on the same host the pid is judged
    assert effective_state(status, alive=lambda pid: False, host=status["host"]) == "interrupted"
    assert effective_state(status, alive=lambda pid: True, host=status["host"]) == "running"


def test_a_failing_status_write_does_not_hide_the_failure_line(tmp_path):
    lines = []
    p = Progress(tmp_path / "no" / "status.json", out=lines.append)
    p.state["total"] = 3
    (tmp_path / "no").write_text("a file where the directory should be")
    p.fail(RuntimeError("real cause"))  # must not raise OSError over the real cause
    assert "real cause" in lines[-1]
