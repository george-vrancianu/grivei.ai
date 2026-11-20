"""The reusable kill-everywhere resume harness (ticket #292, spec #285). Used by the DB tests; not a test module itself. Reused by #293 (a kill in the
middle of the unit loop), #294 (a kill after an ONRC snapshot), #295 (the code-ownership gate) and spec #286.

A `KillPoint` is a named place where a build is made to die: `arm(monkeypatch, killed_by)` installs the failure. The harness core (`Harness`) knows nothing
about where: for each point it runs a beside build with the point armed (it must die), reruns it with nothing armed, and compares the whole graph dump
(`graph_dump.dump_graph`, the build ledger included, minus timestamps) and the printed summary with an uninterrupted build's. Everything goes through
`pipeline rebuild` (`cli.main`) over a throwaway database and the graph it leaves.

The built-in points, `step_kill_points()`, are derived from `STEPS` when called: for every Step X, "inside X after its body, before its ledger row"
(the Step's work, its sequence values and its progress lines happened; its transaction rolls back, so X-1 is the last committed Step). A Step another
ticket adds is covered with no change here. `vacuum_kill_points()` adds, for every Step that declares tables to VACUUM, a kill after its commit and before its VACUUM. Kill with `SystemExit(143)` (what SIGTERM becomes in the CLI) or `RuntimeError` (a bug or a lost connection)."""
from __future__ import annotations

import difflib
import shutil
import signal
import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable

import psycopg

import pipeline.build_steps as build_steps_module
import pipeline.onrc.build as onrc_build_module
from graph_dump import dump_graph
from pipeline import cli
from pipeline.build_steps import STEPS
from pipeline.onrc.people import SECRET_ENV

FIXTURES = Path(__file__).parent / "fixtures"
# Every fixture that makes a Step do real work: SEAP bulk and crawl units (units, crawl-status, crawl-badges, frameworks, entities, coverage, signals),
# ANAF answers, ONRC snapshots with people (onrc, onrc-search), the MF list, placement, AEP, financials and donations.
WORLD = ("archive-placement", "archive-mf", "archive-aep", "archive-financials", "archive-banipartide", "archive-onrc-signals", "archive-crawl")
TODAY = date(2026, 11, 20)


@dataclass(frozen=True)
class KillPoint:
    name: str
    arm: Callable[[object, BaseException], None]  # (monkeypatch, killed_by): installs the failure; nothing runs until the build reaches the place
    resumes: bool = True  # whether the rerun is a resume (False: nothing is committed to resume from, so it is fresh)


def _after_body_before_row(step_name: str):
    real = build_steps_module.write_step

    def arm(monkeypatch, killed_by: BaseException) -> None:
        def write_step(cur, name, ordinal, summary):
            if name == step_name:
                raise killed_by
            return real(cur, name, ordinal, summary)

        monkeypatch.setattr(build_steps_module, "write_step", write_step)  # a module global, looked up at call time
    return arm


def step_kill_points() -> list[KillPoint]:
    """One point per Step of `STEPS`: killed inside it after its body, before its ledger row. The first Step's kill leaves nothing committed (fresh)."""
    return [KillPoint(f"in-{step.name}", _after_body_before_row(step.name), resumes=ordinal > 0) for ordinal, step in enumerate(STEPS)]


def vacuum_kill_points() -> list[KillPoint]:
    """For every Step that declares tables to VACUUM: killed after its commit, before its VACUUM (#298). The rerun resumes after that Step and runs the VACUUM again."""
    real = build_steps_module._vacuum_after

    def after_commit(step_name: str):
        def arm(monkeypatch, killed_by: BaseException) -> None:
            def vacuum_after(ctx, step):
                if step.name == step_name:
                    raise killed_by
                return real(ctx, step)

            monkeypatch.setattr(build_steps_module, "_vacuum_after", vacuum_after)
        return arm

    return [KillPoint(f"before-vacuum-{step.name}", after_commit(step.name)) for step in STEPS if step.vacuum]


def onrc_snapshot_kill_points(snapshots: int = 4) -> list[KillPoint]:
    """For every ONRC snapshot k of the default world: killed right after the k-th snapshot's commit (#294). The rerun resumes with the next snapshot; after the
    last one only the Step's closing work (coverage, registrations, people) is left."""
    def after_snapshot(k: int):
        def arm(monkeypatch, killed_by: BaseException) -> None:
            seen = []

            def hook(unit):
                seen.append(unit)
                if len(seen) == k:
                    raise killed_by

            monkeypatch.setattr(onrc_build_module, "_after_snapshot", hook)  # a module global, looked up at call time
        return arm

    return [KillPoint(f"after-onrc-snapshot-{k}", after_snapshot(k)) for k in range(1, snapshots + 1)]


def make_world(root: Path, worlds=WORLD, drop: tuple[str, ...] = ()) -> Path:
    """A fresh archive copy of the fixture worlds (a build moves the files it sets aside, so every build reads a copy of its own)."""
    for name in worlds:
        shutil.copytree(FIXTURES / name, root, dirs_exist_ok=True)
    for d in drop:
        shutil.rmtree(root / d)
    return root


@dataclass
class Outcome:
    out: list[str]  # the stdout lines of the run (the verdict line first)
    graph: dict  # the dump of the live database afterwards (None when the run died)
    url: str = ""  # the live database
    archive: Path = Path()

    @property
    def first(self) -> str:
        """The run's first log line without its timestamp: the resume / fresh verdict."""
        line = self.out[0]
        return line.split(" ", 1)[1] if line[:4].isdigit() else line


class Harness:
    """Builds into `<live>` beside, through `pipeline rebuild`. One instance per fixture world; `reference()` is built once."""

    def __init__(self, server: str, tmp_path: Path, monkeypatch, capsys, world: Callable[[Path], Path] = make_world):
        self.server, self.tmp, self.monkeypatch, self.capsys, self.world = server, tmp_path, monkeypatch, capsys, world
        self._n = 0
        monkeypatch.setenv(SECRET_ENV, "dummy-secret-for-tests-only-0123456789")

    def new_live(self) -> str:
        """An empty database to be the live graph (the Switchover builds `<name>_next` beside it)."""
        self._n += 1
        name = f"live{time.time_ns()}"
        with psycopg.connect(f"{self.server}/postgres", autocommit=True) as c:
            c.execute(f'CREATE DATABASE "{name}"')
        return f"{self.server}/{name}"

    def new_archive(self, label: str) -> Path:
        return self.world(self.tmp / f"{label}-{self._n}-archive")

    def args(self, archive: Path, live: str, *extra: str) -> list[str]:
        data = self.tmp / "placement-data"
        if not data.exists():
            shutil.copytree(FIXTURES / "placement-data", data)
        return ["--archive", str(archive), "rebuild", "--db", live, "--identity-overrides", str(FIXTURES / "identity-overrides.toml"),
                "--placement-data", str(data), "--geo-dir", str(self.tmp / "geo"), "--known-gaps", str(FIXTURES / "mf-known-gaps.csv"),
                "--today", TODAY.isoformat(), "--progress-file", str(self.tmp / "status.json"), *extra]

    def run(self, archive: Path, live: str, *extra: str, kill: KillPoint | None = None, killed_by: BaseException | None = None) -> Outcome:
        """One `pipeline rebuild`. With `kill` armed the build must die with `killed_by`; its stdout lines are returned either way."""
        self.capsys.readouterr()
        previous = signal.getsignal(signal.SIGTERM)
        try:
            with self.monkeypatch.context() as m:
                if kill:
                    kill.arm(m, killed_by)
                try:
                    code = cli.main(self.args(archive, live, *extra))
                except BaseException as e:
                    if not kill or not isinstance(e, type(killed_by)):
                        raise
                    code = None
        finally:
            signal.signal(signal.SIGTERM, previous)
        lines = self.capsys.readouterr().out.splitlines()
        if kill:
            assert code is None, f"the build armed with {kill.name} did not die"
            return Outcome(lines, None, live, archive)
        assert code == 0, lines
        return Outcome(lines, dump_graph(live), live, archive)

    _references: dict = {}  # (server, world function) -> the uninterrupted build: once per world for the whole test session (so a world must be a module-level function: a lambda made inside a test is a new key every time)

    def reference(self) -> Outcome:
        """An uninterrupted beside build of the world, once."""
        key = (self.server, self.world)
        if key not in self._references:
            self._references[key] = self.run(self.new_archive("reference"), self.new_live())
        return self._references[key]

    def kill_then_resume(self, point: KillPoint, killed_by: BaseException, *extra: str,
                         between: Callable[[Path, str], None] | None = None) -> tuple[Path, Outcome, Outcome]:
        """Kill a beside build at `point`, rerun it with nothing armed: (the archive, the killed run, the rerun). The rerun's graph is the live one after the swap.
        `between(archive, live_url)` runs after the kill and before the rerun: what changes in the meantime (a unit lands, the code changes, a ledger row goes)."""
        archive, live = self.new_archive(point.name), self.new_live()
        killed = self.run(archive, live, kill=point, killed_by=killed_by)
        if between:
            between(archive, live)
        return archive, killed, self.run(archive, live, *extra)

    def assert_resumes_like_reference(self, point: KillPoint, killed_by: BaseException, *, between: Callable[[Path, str], None] | None = None,
                                      expect: str | None = None) -> Outcome:
        """Kill at `point`, rerun, and compare with the uninterrupted build. `expect`: the verdict the rerun must lead with (`resume` or `fresh`; the point's
        own `resumes` by default); `between` as in `kill_then_resume`. Needs a `world` that is a module-level function: the reference is cached by it."""
        ref = self.reference()
        archive, killed, rerun = self.kill_then_resume(point, killed_by, between=between)
        assert killed.first.startswith("rebuild: fresh - "), killed.out[:2]  # a first build into an empty server: fresh, no next database
        verdict = expect or ("resume" if point.resumes else "fresh")
        assert rerun.first.startswith(f"rebuild: {verdict} - "), rerun.out[0]
        assert rerun.graph == ref.graph, point.name
        got, want = _summary(rerun.out, archive), _summary(ref.out, ref.archive)
        assert got == want, f"{point.name}: " + "\n".join(difflib.unified_diff(want, got, "uninterrupted", "resumed", lineterm=""))  # the resumed Steps' lines too
        return rerun


def _summary(lines: list[str], archive: Path) -> list[str]:
    """The `summary.lines()` part of a run's stdout (the log lines are timestamped, these are not), with the archive's own path made comparable."""
    return [line.replace(str(archive), "<archive>") for line in lines if not line[:4].isdigit() and not line.startswith("rebuild:")]
