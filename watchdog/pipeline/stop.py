"""Cooperative pause of a staged rebuild (spec #285, ticket #296): one controller owns every way to ask for it, the build asks it at its commit boundaries.

A pause is requested by the first SIGTERM, by a stop file (`<archive>/rebuild.stop`: the Raw archive is mounted in every container, so `touch` works from
any of them) or by the `--pause-after` deadline (off unless given; measured from the process start). The build checks at a committed boundary only (after
a Step, after a unit of the unit loop, after an ONRC snapshot): `pause_point` marks `build.run.state` paused, deletes the stop file it paused on (so the
next trigger resumes instead of pausing again) and raises `BuildPaused`. A second SIGTERM aborts the Step in progress as before (`SystemExit`: it rolls back,
the committed work stays, the run reads `interrupted (resumable)`).

A request that arrives after the last boundary (during the last Step) cannot pause anything: the build is complete, and a complete build is never resumed, so
throwing it away would waste it. The build finishes and switches over; `build_finished` notes the request, and a refresh or seed run ends after its load
(the backups stay due). A stop file nobody consumed is removed when a build finishes and when a run ends, so it never pauses a later build by surprise.

Only a staged build has boundaries: a plain `--in-place` build is one transaction, so there a signal behaves as it always did and the stop file is ignored.
"""
from __future__ import annotations

import re
import signal
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg

from .build_ledger import PAUSED

STOP_FILE = "rebuild.stop"
PAUSED_EXIT_CODE = 75  # EX_TEMPFAIL: not done, try again later; `rebuild && next` never goes on as if the graph had switched


class BuildPaused(Exception):
    """A staged build stopped at a committed boundary on request. `reached` says where (the step, unit or snapshot just committed), `reason` why."""

    def __init__(self, reached: str, reason: str, database: str = ""):
        super().__init__(f"paused {reached}: {reason}")
        self.reached, self.reason, self.database = reached, reason, database  # `database`: the one holding the committed work (a full extra copy of the graph on disk for a beside build)


def parse_duration(text: str) -> float:
    """`90m`, `8h`, `45s`, `1d` (or a bare number of seconds) as seconds."""
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*([smhd]?)\s*", text)
    if not m or float(m.group(1)) <= 0:
        raise ValueError(f"not a duration like 90m or 8h: {text!r}")
    return float(m.group(1)) * {"": 1, "s": 1, "m": 60, "h": 3600, "d": 86400}[m.group(2)]


class _Controller:
    def __init__(self) -> None:
        self.configure(None, None)

    def configure(self, root: Path | None, pause_after: float | None, clock=time.monotonic) -> None:
        """A new run of the process: forget an earlier request, watch `root`'s stop file, start the deadline clock."""
        self.root, self._clock = root, clock
        self.deadline = clock() + pause_after if pause_after else None
        self.requested = False
        self.building = False
        self.late = False  # a stop request that arrived after the last boundary of a build that then completed (see `build_finished`)

    def reason(self) -> str | None:
        if self.requested:
            return "stop requested (SIGTERM)"
        if self.root is not None and (self.root / STOP_FILE).exists():
            return f"stop requested ({STOP_FILE})"
        if self.deadline is not None and self._clock() >= self.deadline:
            return "the --pause-after deadline was reached"
        return None

    def on_sigterm(self, signum, frame) -> None:
        if self.building and not self.requested:
            self.requested = True
            say("stop requested: pausing at the next boundary (a second SIGTERM aborts the step in progress)")
            return
        sys.exit(128 + signum)

    def build_finished(self) -> None:
        """A build completed (staged or plain `--in-place`). A request that came after its last boundary is not lost work: the build is complete and `decide()` would
        not resume a complete one, so it is kept and the run stops after it (`pending()`: a refresh ends before its backups). A stop file left over is removed,
        so it never pauses a later build by surprise."""
        if self.requested:
            self.late = True
            say("stop requested after the last boundary: the build is complete; stopping after it")
        if self.root is not None and (self.root / STOP_FILE).exists():
            self.late = True
            self.clear_stop_file("it arrived after the last boundary of a build that completed")

    def clear_stop_file(self, why: str) -> None:
        if self.root is not None and (self.root / STOP_FILE).exists():
            (self.root / STOP_FILE).unlink(missing_ok=True)
            say(f"{STOP_FILE} removed: {why}")

    def pending(self) -> bool:
        """A stop request is outstanding after the load: the signal flag, a stop file, or one `build_finished` saw."""
        return self.requested or self.late or (self.root is not None and (self.root / STOP_FILE).exists())


def say(message: str) -> None:
    """One line on stderr: `rebuild` does not route the `pipeline` logger, `refresh`/`seed` do (a log line there would appear twice)."""
    print(message, file=sys.stderr, flush=True)


STOP = _Controller()


def install(root: Path, pause_after: float | None = None) -> None:
    """The process-level setup of a rebuild or refresh run: SIGTERM is a pause request inside a staged build, a kill everywhere else."""
    STOP.configure(root, pause_after)
    signal.signal(signal.SIGTERM, STOP.on_sigterm)


@contextmanager
def staged_build() -> Iterator[None]:
    """The span in which a pause is possible (the Steps of a staged build)."""
    STOP.building = True
    try:
        yield
    finally:
        STOP.building = False


def pause_point(cur: psycopg.Cursor, reached: str) -> None:
    """Called right after a boundary committed (the connection is autocommit, no transaction open). Pauses the build when a pause was asked for."""
    if not STOP.building or (reason := STOP.reason()) is None:
        return
    cur.execute("UPDATE build.run SET state = %s WHERE one", (PAUSED,))
    if STOP.root is not None:
        (STOP.root / STOP_FILE).unlink(missing_ok=True)  # consumed: the next trigger resumes instead of pausing again
    raise BuildPaused(reached, reason, cur.connection.info.dbname)
