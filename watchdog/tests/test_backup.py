"""Step 5 of the refresh (#82): restic of the raw archive and the weekly pg_dump, against a local encrypted repository (never real object
storage). restic is `restic` on the PATH, or PIPELINE_RESTIC_BIN, or the official image through tests/tools/restic-docker.sh (needs Docker)."""
import hashlib
import os
import shutil
import stat
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from pipeline.archive import Archive
from pipeline.backup import Restic, backup_archive, backup_dump, restore_archive, restore_dump
from pipeline.refresh import Pinger, run_refresh
from pipeline.refresh.engine import DeterministicError, TransientError
from pipeline.refresh.steps import Impl, StepResult
from test_refresh import Clock, START

DOCKER_WRAPPER = Path(__file__).parent / "tools" / "restic-docker.sh"


def _restic_command() -> str:
    if os.environ.get("PIPELINE_RESTIC_BIN"):
        return os.environ["PIPELINE_RESTIC_BIN"]
    if shutil.which("restic"):
        return "restic"
    if shutil.which("docker") and subprocess.run(["docker", "image", "inspect", "restic/restic:0.18.1"], capture_output=True).returncode == 0:
        return str(DOCKER_WRAPPER)
    pytest.skip("no restic: install it, set PIPELINE_RESTIC_BIN, or `docker pull restic/restic:0.18.1`")


@pytest.fixture
def restic(tmp_path):
    env = {"RESTIC_REPOSITORY": str(tmp_path / "repo"), "RESTIC_PASSWORD": "correct horse", "PP37_RESTIC_MOUNTS": f"{tmp_path}"}
    return Restic(repository=env["RESTIC_REPOSITORY"], binary=[_restic_command()], env=env)


def _tree(root: Path) -> dict[str, str]:
    """Every file under `root` -> its sha256: what "byte for byte" compares."""
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob("*")) if p.is_file()}


def _archive(tmp_path) -> Archive:
    a = Archive(tmp_path / "archive")
    a.write_unit(source="seap", stream="bulk", kind="da", unit="2024Q1", fetched_at=START, files={"f.csv": "Ținta;Ș\n1;2\n".encode(), "big.bin": os.urandom(300_000)}, via="v")
    a.write_unit(source="anaf", stream="s", kind="k", unit="u1", fetched_at=START + timedelta(days=1), files={"a.json": b'{"cui": 1}'})
    (a.root / "refresh.lock").write_text("12345")
    return a


def test_a_restore_from_the_restic_copy_reproduces_the_archive_byte_for_byte_and_the_repository_is_encrypted(restic, tmp_path):
    archive = _archive(tmp_path)
    say = []
    result = backup_archive(archive, restic, say.append)
    assert result.counts == {"snapshots": 1}

    restored = restore_archive(restic, tmp_path / "restored")
    expected = {k: v for k, v in _tree(archive.root).items() if k != "refresh.lock"}  # the lock is operational: never backed up
    assert _tree(restored) == expected and len(expected) == 5  # manifests and files of both units, same bytes
    assert Archive(restored).units() and [u.unit for u in Archive(restored).units()] == [u.unit for u in archive.units()]  # and the archive reads it

    stored = b"".join(p.read_bytes() for p in (tmp_path / "repo").rglob("*") if p.is_file())
    assert "Ținta".encode() not in stored and b'"cui"' not in stored  # no plaintext in the repository
    wrong = Restic(repository=restic.repository, binary=restic.binary, env={**restic.env, "RESTIC_PASSWORD": "wrong"})
    with pytest.raises(TransientError):
        wrong.snapshots("archive")
    with pytest.raises(FileExistsError):
        restore_archive(restic, restored)  # never over a directory with files in it


def test_a_second_backup_adds_a_snapshot_and_a_changed_archive_restores_as_it_was_then(restic, tmp_path):
    archive = _archive(tmp_path)
    backup_archive(archive, restic, lambda _: None)
    first = _tree(archive.root)
    archive.write_unit(source="seap", stream="bulk", kind="da", unit="2024Q2", fetched_at=START + timedelta(days=2), files={"g.csv": b"new"}, via="v")
    assert backup_archive(archive, restic, lambda _: None).counts == {"snapshots": 2}
    latest = restore_archive(restic, tmp_path / "latest")
    assert _tree(latest) == {k: v for k, v in _tree(archive.root).items() if k != "refresh.lock"}
    oldest = min(restic.snapshots("archive"), key=lambda s: s["time"])["id"]
    assert _tree(restore_archive(restic, tmp_path / "old", oldest)) == {k: v for k, v in first.items() if k != "refresh.lock"}


def _script(path: Path, body: str) -> list[str]:
    path.write_text("#!/bin/sh\n" + body)
    path.chmod(path.stat().st_mode | stat.S_IXUSR)
    return [str(path)]


def test_the_pg_dump_goes_through_restic_without_touching_the_disk_and_a_failing_pg_dump_is_not_a_snapshot(restic, tmp_path):
    dump = _script(tmp_path / "fake_pg_dump", 'head -c 200000 /dev/zero | tr "\\0" "x"\n')
    assert backup_dump("postgresql://x/y", restic, lambda _: None, pg_dump=dump).counts == {"snapshots": 1}
    out = tmp_path / "restored.dump"
    restore = _script(tmp_path / "fake_pg_restore", f'cat > {out}\n')
    restore_dump(restic, "postgresql://x/y", pg_restore=restore)
    assert out.read_bytes() == b"x" * 200_000

    broken = _script(tmp_path / "broken_pg_dump", 'echo "pg_dump: error: connection refused" >&2\nexit 1\n')
    with pytest.raises(TransientError, match="connection refused"):
        backup_dump("postgresql://x/y", restic, lambda _: None, pg_dump=broken)
    assert len(restic.snapshots("pgdump")) == 1  # the weekly one from before; the failed run left none (restic saw an empty stdin and a nonzero pg_dump)


def test_unset_repository_is_a_logged_warning_not_a_failure_and_a_missing_password_or_binary_is_deterministic(tmp_path, monkeypatch):
    archive = _archive(tmp_path)
    say = []
    nothing = Restic(repository=None, binary=["restic"], env={})
    saved = os.environ.pop("RESTIC_REPOSITORY", None)
    try:
        assert backup_archive(archive, nothing, say.append).counts == {"skipped": "not configured"}
        assert backup_dump("postgresql://x/y", nothing, say.append).counts == {"skipped": "not configured"}
    finally:
        if saved:
            os.environ["RESTIC_REPOSITORY"] = saved
    assert sum("WARNING RESTIC_REPOSITORY is not set" in line for line in say) == 2
    for k in ("RESTIC_PASSWORD", "RESTIC_PASSWORD_FILE", "RESTIC_PASSWORD_COMMAND"):
        monkeypatch.delenv(k, raising=False)
    with pytest.raises(DeterministicError, match="no password"):
        Restic(repository=str(tmp_path / "r"), binary=["restic"], env={"RESTIC_REPOSITORY": str(tmp_path / "r")}).snapshots("archive")
    with pytest.raises(DeterministicError, match="restic not found"):
        Restic(repository=str(tmp_path / "r"), binary=["no-such-restic-binary"], env={"RESTIC_REPOSITORY": str(tmp_path / "r"), "RESTIC_PASSWORD": "p"}).ensure_repository(say.append)


def test_the_backup_steps_ride_the_refresh_nightly_and_weekly_and_a_skipped_step_stays_due(restic, tmp_path):
    archive, clock, calls = Archive(tmp_path / "ra"), Clock(), []
    skipped = {"on": True}

    def backup():
        calls.append("backup")
        return StepResult({"skipped": "not configured"}) if skipped["on"] else StepResult({"snapshots": 1})

    def pgdump():
        calls.append("pgdump")
        return StepResult({"skipped": "not configured"}) if skipped["on"] else StepResult({"snapshots": 1})

    impl = Impl(archive, print, None, None, None, None, lambda: StepResult(), backup_fn=backup, pgdump_fn=pgdump)
    impl.crawl = impl.datagov = impl.anaf = impl.load = lambda: StepResult()
    run = lambda: run_refresh(archive, impl, pinger=Pinger(None), now=clock.now, sleep=clock.sleep, say=lambda _: None)
    assert [s["name"] for s in run().run["steps"]][-2:] == ["backup", "pgdump"]
    run()
    assert calls == ["backup", "pgdump", "backup", "pgdump"]  # not configured: nothing was backed up, so it is due again at the next trigger
    skipped["on"] = False
    run()
    run()
    assert calls[4:] == ["backup", "pgdump"]  # configured: done, and a second trigger the same day does not repeat it
    clock.moment += timedelta(days=1)
    run()
    assert calls[6:] == ["backup"]  # the next day only the nightly one
    clock.moment += timedelta(days=6)
    run()
    assert calls[7:] == ["backup", "pgdump"]  # a week after the dump
