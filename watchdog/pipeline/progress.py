"""Progress of a long `pipeline rebuild`: timestamped log lines and a small status file (for an unattended nohup run).

Two signals, both written as the rebuild goes:
- one line per unit on stdout, flushed at once (no TTY tricks, so `tail -f` on a nohup log is current), then a final line:

    2026-11-12T10:15:02+0200 rebuild unit 37/412 kind=contracte unit=2023Q2 files=1 rows=124000 records=98000 loaded in 41.2s
    2026-11-12T10:15:02+0200 rebuild unit 38/412 kind=dan unit=2024Q1 files=1 rows=0 records=0 skipped (same file already loaded)
    2026-11-12T10:15:03+0200 rebuild unit 39/412 kind=da unit=2023Q2 files=1 rows=0 records=0 quarantined (headers do not match a DA file)
    2026-11-12T10:40:12+0200 rebuild step search-index: start
    2026-11-12T10:44:09+0200 rebuild step search-index done in 0:03:57
    2026-11-12T10:44:10+0200 rebuild done units=412 loaded=398 skipped=9 quarantined=5 records=3120000 in 1:29:08

  The stages before and after the units (building entities, placement, the rollup, the search index, the commit, the
  VACUUM, the outlines) each get a `step NAME: start` line and a `step NAME done in H:MM:SS` line, so a long silence
  in the log names the stage it is in.

- a status file, rewritten after every unit (and when one starts) by writing a temporary file and renaming it over the old
  one, so a reader never sees half of it. `pipeline status` reads it. A run that is killed leaves `state: running` with
  a process id that no longer exists, which `describe()` reports as interrupted.
"""
from __future__ import annotations

import json
import os
import socket
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterator, TextIO

STATUS_VERSION = 1
DEFAULT_STATUS_NAME = "rebuild-progress.json"


def stamp(now: datetime) -> str:
    return now.astimezone().strftime("%Y-%m-%dT%H:%M:%S%z")


def _iso(now: datetime) -> str:
    return now.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _duration(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"


def write_atomically(path: Path, text: str) -> None:
    """Temp file in the same directory, then rename: the file is either the old text or the new, never half."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


class Progress:
    """Reports a rebuild. `out` takes one finished line (default: stdout, flushed); `now` is injectable for tests."""

    def __init__(
        self,
        status_file: Path | None = None,
        out: Callable[[str], None] | None = None,
        now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
        stream: TextIO | None = None,
    ):
        self.status_file = status_file
        self._now = now
        self._out = out or (lambda line: print(line, file=stream, flush=True))
        self.state: dict = {
            "version": STATUS_VERSION,
            "pid": os.getpid(),
            "host": socket.gethostname(),  # in Docker, the container id: a pid means nothing in another container
            "state": "starting",
            "startedAt": _iso(now()),
            "updatedAt": _iso(now()),
            "total": 0,
            "done": 0,
            "loaded": 0,
            "skipped": 0,
            "quarantined": 0,
            "records": 0,
            "current": None,
            "step": None,
            "last": None,
            "error": None,
        }
        self._started = now()
        self._unit_started = self._started

    # ---- events -----------------------------------------------------------------------------------------------

    def start(self, total: int, archive: Path | str) -> None:
        self.state.update(state="running", total=total)
        self._line(f"rebuild start units={total} archive={archive} pid={os.getpid()}")

    def begin(self, index: int, total: int, kind: str, unit: str) -> None:
        self._unit_started = self._now()
        self.state["current"] = {"index": index, "kind": kind, "unit": unit}
        self._write()

    def unit_done(self, index: int, total: int, kind: str, unit: str, files: int, rows: int, records: int, outcome: str, reason: str | None = None) -> None:
        took = (self._now() - self._unit_started).total_seconds()
        detail = {"loaded": f"loaded in {took:.1f}s", "skipped": f"skipped ({reason})", "quarantined": f"quarantined ({reason})"}[outcome]
        self.state[outcome] += 1
        self.state["done"] = index
        self.state["current"] = None
        self.state["records"] += records if outcome == "loaded" else 0
        self._line(f"rebuild unit {index}/{total} kind={kind} unit={unit} files={files} rows={rows} records={records} {detail}")

    @contextmanager
    def step(self, name: str) -> Iterator[None]:
        """One stage outside the per-unit loop: a start line, then a done line with its duration. A stage that raises gets
        no done line and stays in the status file's `step`, so the FAILED line and `pipeline status` name it."""
        started = self._now()
        self.state["step"] = name
        self._line(f"rebuild step {name}: start")
        yield
        self.state["step"] = None
        self._line(f"rebuild step {name} done in {_duration((self._now() - started).total_seconds())}")

    def finish(self, records_in_graph: int, data_through: dict[str, str] | None = None) -> None:
        s = self.state
        s.update(state="finished", records=records_in_graph, current=None, dataThrough=data_through or {})
        took = _duration((self._now() - self._started).total_seconds())
        self._line(f"rebuild done units={s['done']} loaded={s['loaded']} skipped={s['skipped']} quarantined={s['quarantined']} records={records_in_graph} in {took}")

    def fail(self, error: BaseException) -> None:
        if self.state.get("state") == "finished":  # the load is committed: a later interrupt (the outlines) must not say "nothing was loaded"
            return
        self.state.update(state="failed", error=f"{type(error).__name__}: {error}".strip(": "))
        try:
            during = f" in step {self.state['step']}" if self.state.get("step") else ""
            self._line(f"rebuild FAILED after {self.state['done']}/{self.state['total']} units{during}: {self.state['error']}; nothing was loaded, rerun from scratch")
        except OSError:  # the status file cannot be written: the real cause must not be replaced by this one
            pass

    # ---- output -----------------------------------------------------------------------------------------------

    def _line(self, text: str) -> None:
        line = f"{stamp(self._now())} {text}"
        self.state["last"] = line
        self._out(line)  # printed before the status file is written: a failing write must not hide the line
        self._write()

    def _write(self) -> None:
        self.state["updatedAt"] = _iso(self._now())
        if self.status_file:
            write_atomically(self.status_file, json.dumps(self.state, indent=2, ensure_ascii=False) + "\n")


def read_status(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _age(status: dict, now: datetime) -> str:
    try:
        then = datetime.strptime(status["updatedAt"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (KeyError, ValueError):
        return "an unknown time"
    return _duration(max(0.0, (now - then).total_seconds()))


def effective_state(status: dict, alive: Callable[[int], bool] = _alive, host: str | None = None) -> str:
    """`running` | `finished` | `failed` | `interrupted` (a `running` file whose process is gone: the rebuild was killed) |
    `unknown` (a `running` file written on another host or container: its pid cannot be looked at from here).

    A pid is only judged when the file's `host` is this one (`host` defaults to this machine's name): in Docker every
    container's python is pid 1, so `status` run in a fresh container would otherwise see a live process for ever.
    """
    state = status.get("state", "unknown")
    if state in ("running", "starting", "scanning"):
        if status.get("host") != (host if host is not None else socket.gethostname()):
            return "unknown"
        if not alive(int(status.get("pid", 0))):
            return "interrupted"
    return state


def describe(status: dict, alive: Callable[[int], bool] = _alive, host: str | None = None, now: datetime | None = None) -> list[str]:
    """The lines `pipeline status` prints."""
    state = effective_state(status, alive, host)
    done, total = status.get("done", 0), status.get("total", 0)
    lines = [
        f"state: {state if state != 'unknown' else 'running? (cannot see the process from here)'}",
        f"units: {done}/{total} done ({status.get('loaded', 0)} loaded, {status.get('skipped', 0)} skipped, {status.get('quarantined', 0)} quarantined)",
        f"records loaded so far: {status.get('records', 0)}",
    ]
    if status.get("dataThrough"):  # per Record kind, as `sources` serves it (bulk: latest publication date; crawled kinds: the cursor too)
        lines.append("data through (as of this rebuild): " + ", ".join(f"{k} {v}" for k, v in sorted(status["dataThrough"].items())))
    if state in ("running", "unknown") and status.get("current"):
        c = status["current"]
        lines.append(f"now: unit {c['index']}/{total} kind={c['kind']} unit={c['unit']}")
    if state in ("running", "unknown") and status.get("step"):
        lines.append(f"now: step {status['step']}")
    lines += [f"started: {status.get('startedAt')}", f"updated: {status.get('updatedAt')} (pid {status.get('pid')} on {status.get('host', 'an unknown host')})"]
    if state == "unknown":
        lines.append(f"written by another host or container; last update {_age(status, now or datetime.now(timezone.utc))} ago: a rebuild still going updates it at least once per unit")
    if status.get("last"):
        lines.append(f"last line: {status['last']}")
    if state == "interrupted":
        lines.append("the rebuild is not running and did not finish: the database is as it was before it started; rerun the same command")
    if state == "failed":
        lines.append(f"error: {status.get('error')}")
    return lines
