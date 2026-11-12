"""Step 5 of the refresh (#82): an encrypted restic copy of the raw archive every night and a weekly `pg_dump`, both into one restic
repository on object storage.

The raw archive is the only data that cannot be fetched again (SEAP and ANAF do not keep their history), so it is the backup that
matters; the graph is derived from it (ADR 0004) and the dump is a convenience that saves the hours of a rebuild.

Configuration is restic's own environment: `RESTIC_REPOSITORY` (e.g. `s3:https://<endpoint>/<bucket>` or `b2:<bucket>:<path>`), the
password (`RESTIC_PASSWORD`, `RESTIC_PASSWORD_FILE` or `RESTIC_PASSWORD_COMMAND`) and the backend's credentials (`AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY`, `B2_ACCOUNT_ID`/`B2_ACCOUNT_KEY`, ...). With `RESTIC_REPOSITORY` unset the steps are skipped with a logged warning.
`PIPELINE_RESTIC_BIN` and `PIPELINE_PG_DUMP` name the executables (default `restic`, `pg_dump`).

The repository is created on first use. After each backup, snapshots are thinned (`forget --prune`): 7 daily, 5 weekly, 12 monthly.
"""
from __future__ import annotations

import json
import os
import shlex
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .archive import Archive
from .refresh.engine import DeterministicError, StepResult, TransientError

ARCHIVE_TAG, DUMP_TAG = "archive", "pgdump"
DUMP_NAME = "grivei.dump"
PENDING_TAG = "pgdump-pending"  # a dump snapshot is tagged `pgdump` only once pg_dump has exited cleanly, so a truncated one is never a restore candidate
HOST = "grivei"
KEEP = ("--keep-daily", "7", "--keep-weekly", "5", "--keep-monthly", "12")  # spec default taken
EXCLUDE = ("refresh.lock",)  # operational, never worth restoring


@dataclass
class Restic:
    """One restic repository, driven through the executable. `env` is added to the process environment (tests pass the repository there)."""

    repository: str | None = field(default_factory=lambda: os.environ.get("RESTIC_REPOSITORY") or None)
    binary: list[str] = field(default_factory=lambda: shlex.split(os.environ.get("PIPELINE_RESTIC_BIN", "restic")))
    env: dict[str, str] = field(default_factory=dict)

    @property
    def configured(self) -> bool:
        return bool(self.repository or self.env.get("RESTIC_REPOSITORY"))

    def _env(self) -> dict[str, str]:
        env = {**os.environ, **self.env}
        if not any(env.get(k) for k in ("RESTIC_PASSWORD", "RESTIC_PASSWORD_FILE", "RESTIC_PASSWORD_COMMAND")):
            raise DeterministicError("backup: RESTIC_REPOSITORY is set but no password (RESTIC_PASSWORD, RESTIC_PASSWORD_FILE or RESTIC_PASSWORD_COMMAND): the copy must be encrypted")
        return env

    def run(self, *args: str, stdin=None, check: bool = True, capture: bool = False, cwd: Path | None = None) -> subprocess.CompletedProcess:
        try:
            done = subprocess.run([*self.binary, *args], env=self._env(), stdin=stdin, cwd=cwd, stdout=subprocess.PIPE if capture else None, stderr=subprocess.PIPE, text=True)
        except FileNotFoundError as e:
            raise DeterministicError(f"backup: restic not found ({self.binary[0]}); install it or set PIPELINE_RESTIC_BIN") from e
        if check and done.returncode != 0:
            detail = (done.stderr or "").strip().splitlines()[-1:]
            raise TransientError(f"restic {args[0]} failed (exit {done.returncode}){': ' + detail[0] if detail else ''}")
        return done

    def ensure_repository(self, say: Callable[[str], None]) -> None:
        if self.run("cat", "config", check=False, capture=True).returncode == 0:
            return
        say("backup: no restic repository there yet, creating it")
        self.run("init")

    def forget(self) -> None:
        self.run("forget", "--prune", "--group-by", "tags", *KEEP, "--quiet")  # by tag only: a one-shot container has a new hostname every run

    def snapshots(self, tag: str) -> list[dict]:
        return json.loads(self.run("snapshots", "--tag", tag, "--json", capture=True).stdout or "[]")


def backup_archive(archive: Archive, restic: Restic, say: Callable[[str], None]) -> StepResult:
    if not restic.configured:
        say("backup: WARNING RESTIC_REPOSITORY is not set, the raw archive is NOT backed up (see watchdog/README.md, Backups)")
        return StepResult({"skipped": "not configured"})
    restic.ensure_repository(say)
    excludes = [a for name in EXCLUDE for a in ("--exclude", name)]
    say(f"backup: restic backup of {archive.root}")
    restic.run("backup", "--tag", ARCHIVE_TAG, "--host", HOST, "--quiet", *excludes, ".", cwd=archive.root.resolve())
    restic.forget()
    return StepResult({"snapshots": len(restic.snapshots(ARCHIVE_TAG))})


def backup_dump(db_url: str | None, restic: Restic, say: Callable[[str], None], pg_dump: list[str] | None = None) -> StepResult:
    """`pg_dump --format=custom | restic backup --stdin`: nothing of the dump touches the disk."""
    if not restic.configured:
        say("backup: WARNING RESTIC_REPOSITORY is not set, the weekly pg_dump is NOT taken (see watchdog/README.md, Backups)")
        return StepResult({"skipped": "not configured"})
    if not db_url:
        raise DeterministicError("backup: no database to dump (pass --db or set DATABASE_URL)")
    restic.ensure_repository(say)
    command = pg_dump or shlex.split(os.environ.get("PIPELINE_PG_DUMP", "pg_dump"))
    say(f"backup: pg_dump of the database into restic ({DUMP_NAME})")
    try:
        dump = subprocess.Popen([*command, "--format=custom", "--no-owner", "--dbname", db_url], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError as e:
        raise DeterministicError(f"backup: {command[0]} not found; install the Postgres client or set PIPELINE_PG_DUMP") from e
    saved = None
    try:
        saved = restic.run("backup", "--tag", PENDING_TAG, "--host", HOST, "--json", "--stdin", "--stdin-filename", DUMP_NAME, stdin=dump.stdout, check=False, capture=True)
    finally:
        dump.stdout.close()
        err = dump.stderr.read().decode(errors="replace").strip()
        code = dump.wait()
    snapshot = next((m["snapshot_id"] for m in map(_json_or_empty, reversed((saved.stdout or "").splitlines())) if m.get("message_type") == "summary"), None) if saved else None
    if code != 0:
        if snapshot:
            restic.run("forget", snapshot, check=False)  # the truncated dump restic stored
        raise TransientError(f"pg_dump failed (exit {code}): {err.splitlines()[-1] if err else ''}")
    if saved.returncode != 0 or not snapshot:
        raise TransientError(f"restic backup of the dump failed (exit {saved.returncode}): {(saved.stderr or '').strip()[-200:]}")
    restic.run("tag", "--set", DUMP_TAG, snapshot, "--quiet")
    restic.forget()
    return StepResult({"snapshots": len(restic.snapshots(DUMP_TAG))})


def _json_or_empty(line: str) -> dict:
    try:
        value = json.loads(line)
    except ValueError:
        return {}
    return value if isinstance(value, dict) else {}


def _latest(restic: Restic, tag: str, snapshot: str) -> dict:
    shots = restic.snapshots(tag)
    if snapshot == "latest":
        if not shots:
            raise LookupError(f"no {tag} snapshot in the repository")
        return max(shots, key=lambda s: s["time"])
    for s in shots:
        if s["id"].startswith(snapshot):
            return s
    raise LookupError(f"no {tag} snapshot {snapshot}")


def restore_archive(restic: Restic, target: Path, snapshot: str = "latest") -> Path:
    """Restore the archive snapshot into `target` (an empty or new directory): its files land directly in `target`."""
    target = Path(target)
    if target.exists() and any(target.iterdir()):
        raise FileExistsError(f"{target} is not empty: restore into a new directory")
    shot = _latest(restic, ARCHIVE_TAG, snapshot)
    restic.run("restore", shot["id"], "--target", str(target), "--quiet")  # backed up from `.`: the snapshot is rooted at the archive directory itself
    return target


def restore_dump(restic: Restic, db_url: str, snapshot: str = "latest", pg_restore: list[str] | None = None) -> None:
    """Restore the dump snapshot into the (existing, empty) database `db_url` with `pg_restore`."""
    shot = _latest(restic, DUMP_TAG, snapshot)
    command = pg_restore or shlex.split(os.environ.get("PIPELINE_PG_RESTORE", "pg_restore"))
    reader = subprocess.Popen([*restic.binary, "dump", shot["id"], DUMP_NAME], env=restic._env(), stdout=subprocess.PIPE)
    try:
        done = subprocess.run([*command, "--no-owner", "--exit-on-error", "--dbname", db_url], stdin=reader.stdout)
    finally:
        reader.stdout.close()
        reader.wait()
    if done.returncode != 0 or reader.returncode != 0:
        raise RuntimeError(f"restore failed (pg_restore exit {done.returncode}, restic exit {reader.returncode})")
