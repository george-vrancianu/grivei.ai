"""Resume or fresh: the decision a rebuild makes before it touches the next database (spec #285, ticket #292).

`decide` is a pure function of the pinned inputs of THIS run (pins.py), what the next database holds (`Held`, read by `load_held`) and `--fresh`. It
returns a `Verdict`: resume (keep the next database, skip its committed Steps, read the pins it holds) or fresh (drop it and rebuild, with this run's
pins), and the reason, which is the first line of the run's log (`Verdict.line`). Later tickets extend it: #295 adds the per-Step code-ownership gate
(a code change confined to Steps that have not run no longer forces fresh), #296 and #297 read the verdict.

Resume only when every one of these holds: not `--fresh`; a staged build (a single-transaction build has nothing committed to resume from); the next
database exists and holds a build ledger with pins; its build is not complete (a finished build that was never swapped in is rebuilt); the code version
and the schema files are the ones it was built with; every pinned unit is still in the archive with the same manifest checksum (a unit this build's own
`units` Step quarantined is gone on purpose: not a difference); its `build.step` rows are exactly a non-empty prefix of the Steps, names and ordinals.
Units that were added to the archive after the pin are NOT a difference: the resume ignores them and the next build pins them (the refresh's load marker then
covers only the pinned units, so the next refresh loads the rest). `load-quarter` always passes a reason as `fresh`: its requeued units were never pinned."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Mapping, Sequence

import psycopg

from .pins import Pins

RESUME, FRESH = "resume", "fresh"
LOAD_QUARTER_REASON = "load-quarter requeued units, which an interrupted build never pinned, so the build starts over"


@dataclass(frozen=True)
class Held:
    """What a next database holds: its run's pins and state, its committed Steps in order, the paths its `units` Step quarantined, and why its ledger
    cannot be used (None when it can)."""
    pins: Pins | None
    state: str | None
    steps: Sequence[tuple[str, int]]
    quarantined: frozenset[str]
    problem: str | None = None


@dataclass(frozen=True)
class Verdict:
    verdict: str  # RESUME | FRESH
    reason: str
    pins: Pins  # the pins the run uses: the held ones on a resume, this run's on a fresh build

    @property
    def resume(self) -> bool:
        return self.verdict == RESUME

    @property
    def line(self) -> str:
        """The first line of the run's log."""
        return f"rebuild: {self.verdict} - {self.reason}"


def _fresh(reason: str, pins: Pins) -> Verdict:
    return Verdict(FRESH, reason, pins)


def decide(pins: Pins, held: Held | None, steps, *, fresh: bool | str = False, staged: bool = True, repair: bool = False, direct: bool = False) -> Verdict:
    """`pins` are this run's, `held` is what the next database holds (None: there is none), `steps` are `STEPS`; `repair`: an interrupted swap is
    repaired before the build (switchover.recover), so there is nothing to continue. `fresh`: True for `--fresh`, or the reason (a verb that always
    rebuilds from the start, e.g. load-quarter). `direct`: a staged build called without a Switchover (no next database was looked at)."""
    names = [s.name for s in steps]
    if fresh:
        return _fresh(fresh if isinstance(fresh, str) else "--fresh given", pins)
    if not staged:
        return _fresh("in-place builds run in one transaction, so nothing is committed to resume from", pins)
    if direct:
        return _fresh("no resume decision was made for this build (a direct call), so it starts from the first Step", pins)
    if repair:
        return _fresh("an interrupted swap is repaired first, so the build starts over", pins)
    if held is None:
        return _fresh("no next database", pins)
    if held.problem or held.pins is None:
        return _fresh(f"the next database has no usable build ledger ({held.problem or 'no pins'})", pins)
    if held.state == "complete":
        return _fresh("the next database holds a build that is already complete (never swapped in)", pins)
    if held.pins.code_version != pins.code_version:
        return _fresh(f"code changed (build {held.pins.code_version[:12]}, now {pins.code_version[:12]})", pins)
    if dict(held.pins.schema_files) != dict(pins.schema_files):
        differing = sorted(n for n in set(held.pins.schema_files) | set(pins.schema_files) if held.pins.schema_files.get(n) != pins.schema_files.get(n))
        return _fresh(f"schema files changed ({', '.join(differing)})", pins)
    changed = _changed_units(held, pins.units)
    if changed:
        return _fresh(f"{len(changed)} pinned unit{'s' if len(changed) != 1 else ''} changed or missing: {changed[0]}", pins)
    prefix = [(name, i) for i, name in enumerate(names[:len(held.steps)])]
    if not held.steps or list(held.steps) != prefix or len(held.steps) >= len(names):
        listed = ", ".join(f"{n}#{i}" for n, i in held.steps) or "none"
        return _fresh(f"the committed Steps ({listed}) are not a proper prefix of the Steps", pins)
    last, nxt = held.steps[-1][0], names[len(held.steps)]
    return Verdict(RESUME, f"continuing after the committed Step {last!r} with {nxt!r}; the pinned inputs and the code are unchanged", held.pins)


def _changed_units(held: Held, units: Mapping[str, str | None]) -> list[str]:
    """The pinned units that are gone or whose manifest changed (sorted). A unit pinned without a manifest is not compared; a unit gone because the
    committed `units` Step quarantined it is not a difference."""
    out = []
    for path, checksum in sorted(held.pins.units.items()):
        if checksum is None:
            continue
        if units.get(path) != checksum and f"quarantine/{path}" not in held.quarantined:
            out.append(path)
    return out


def load_held(next_url: str) -> Held:
    """What the database at `next_url` holds: its `build.run` pins and state and its committed Steps. A database with no ledger, or one built before
    the pins existed, comes back with a `problem` (the decision says fresh)."""
    try:
        with psycopg.connect(next_url, autocommit=True) as conn:
            cur = conn.cursor()
            cur.execute("SELECT to_regclass('build.run') IS NOT NULL AND to_regclass('build.step') IS NOT NULL")
            if not cur.fetchone()[0]:
                return Held(None, None, [], frozenset(), "the build schema is missing")
            cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_schema = 'build' AND table_name = 'run' "
                        "AND column_name IN ('pinned_units', 'code_version', 'schema_files', 'today', 'pinned_quarantine')")
            if cur.fetchone()[0] != 5:
                return Held(None, None, [], frozenset(), "the build ledger was written before pinned inputs")
            cur.execute("SELECT state, pinned_units, code_version, schema_files, today, pinned_quarantine FROM build.run")
            runs = cur.fetchall()
            if len(runs) != 1:
                return Held(None, None, [], frozenset(), f"the build ledger has {len(runs)} runs")
            state, units, code, schema, today, quarantine = runs[0]
            cur.execute("SELECT name, ordinal FROM build.step ORDER BY ordinal")
            steps = [(n, o) for n, o in cur.fetchall()]
            cur.execute("SELECT summary->'quarantined' FROM build.step WHERE name = 'units'")
            row = cur.fetchone()
            quarantined = frozenset(row[0] or []) if row else frozenset()
            return Held(Pins(units, code, schema, today, tuple(quarantine)), state, steps, quarantined)
    except psycopg.Error as e:
        return Held(None, None, [], frozenset(), f"the next database could not be read: {type(e).__name__}")
