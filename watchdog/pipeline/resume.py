"""Resume or fresh: the decision a rebuild makes before it touches the next database (spec #285, ticket #292).

`decide` is a pure function of the pinned inputs of THIS run (pins.py), what the next database holds (`Held`, read by `load_held`) and `--fresh`. It
returns a `Verdict`: resume (keep the next database, skip its committed Steps, read the pins it holds) or fresh (drop it and rebuild, with this run's
pins), and the reason, which is the first line of the run's log (`Verdict.line`). Later tickets extend it: #295 adds the per-Step code-ownership gate
(a code change confined to Steps that have not run no longer forces fresh), #296 and #297 read the verdict.

Resume only when every one of these holds: not `--fresh`; a staged build (a single-transaction build has nothing committed to resume from); the next
database exists and holds a build ledger with pins; its build is not complete (a finished build that was never swapped in is rebuilt); the schema files are
the ones it was built with; the code is the one it was built with, or every changed code file belongs only to Steps that have not run (#295: ownership comes
from the Step declarations, `owners_of`; a SHARED file, a file no declaration claims and an outside input belong to every Step, so changing one starts fresh;
a Step with committed work but no ledger row yet, `Held.partial`, counts as run; a file added or deleted counts as changed). Several Steps rewrite
`seap.search` in place, so a completed Step cannot be rewound alone: a change to its code starts over. A resume after a code change continues with the new
code, and `build.run` takes the new hashes and the changed files (build_ledger.record_code_change); every pinned unit is still in the archive with the same manifest checksum (a unit this build's own
`units` Step quarantined is gone on purpose: not a difference); its `build.step` rows are exactly a non-empty prefix of the Steps, names and ordinals.
Units that were added to the archive after the pin are NOT a difference: the resume ignores them and the next build pins them (the refresh's load marker then
covers only the pinned units, so the next refresh loads the rest). `load-quarter` always passes a reason as `fresh`: its requeued units were never pinned."""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date
from typing import Callable, Mapping, Sequence

import psycopg

from .pins import Pins

RESUME, FRESH = "resume", "fresh"
LOAD_QUARTER_REASON = "load-quarter always starts over (units it requeues or that landed since were never pinned by an interrupted build)"


@dataclass(frozen=True)
class Held:
    """What a next database holds: its run's pins and state, its committed Steps in order, the paths its `units` Step quarantined, and why its ledger
    cannot be used (None when it can)."""
    pins: Pins | None
    state: str | None
    steps: Sequence[tuple[str, int]]
    quarantined: frozenset[str]
    problem: str | None = None
    unit_rows: Sequence[tuple[str, str | None]] = ()  # the committed units of an unfinished `units` Step (build.unit, #293): (path, manifest checksum), in unit order
    units_total: int = 0  # the units the loop planned, as those rows record it
    snapshot_rows: bool = False  # the `onrc` Step has committed `build.snapshot` rows of its own (#295)

    @property
    def partial(self) -> frozenset[str]:
        """Steps with committed work of their own but no ledger row yet (onrc: `build.snapshot` rows; units: `build.unit` rows, #293): they have run, for the code gate."""
        return frozenset((["onrc"] if self.snapshot_rows else []) + (["units"] if self.unit_rows else []))


@dataclass(frozen=True)
class Verdict:
    verdict: str  # RESUME | FRESH
    reason: str
    pins: Pins  # the pins the run uses: the held ones on a resume (with this run's code hashes after a gated code change), this run's on a fresh build
    changed_files: tuple[str, ...] = ()  # the code files that differ from the held build's (sorted); on a resume, build.run records them

    @property
    def resume(self) -> bool:
        return self.verdict == RESUME

    @property
    def line(self) -> str:
        """The first line of the run's log."""
        return f"rebuild: {self.verdict} - {self.reason}"


def _fresh(reason: str, pins: Pins, changed: tuple[str, ...] = ()) -> Verdict:
    return Verdict(FRESH, reason, pins, changed)


def _files(files: Sequence[str], limit: int = 5) -> str:
    return ", ".join(files[:limit]) + (f" +{len(files) - limit} more" if len(files) > limit else "")


def _changed_files(held: Mapping[str, str], now: Mapping[str, str]) -> list[str]:
    """The code files that differ between two per-file hash maps (added, deleted or changed), sorted."""
    return sorted(f for f in set(held) | set(now) if held.get(f) != now.get(f))


def decide(pins: Pins, held: Held | None, steps, *, fresh: bool | str = False, staged: bool = True, repair: bool = False, direct: bool = False,
           owners: Callable[[str], set[str]] | None = None) -> Verdict:
    """`pins` are this run's, `held` is what the next database holds (None: there is none), `steps` are `STEPS`; `repair`: an interrupted swap is
    repaired before the build (switchover.recover), so there is nothing to continue. `fresh`: True for `--fresh`, or the reason (a verb that always
    rebuilds from the start, e.g. load-quarter). `direct`: a staged build called without a Switchover (no next database was looked at).
    `owners`: a package-relative code path (or `extra:...` key) -> the names of the Steps it belongs to (default: `build_steps.owners_of` over `steps`)."""
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
    changed_code = _changed_files(held.pins.code_files, pins.code_files)
    if held.pins.code_version != pins.code_version and not changed_code:
        return _fresh(f"code changed (build {held.pins.code_version[:12]}, now {pins.code_version[:12]})", pins)
    if dict(held.pins.schema_files) != dict(pins.schema_files):
        differing = sorted(n for n in set(held.pins.schema_files) | set(pins.schema_files) if held.pins.schema_files.get(n) != pins.schema_files.get(n))
        return _fresh(f"schema files changed ({', '.join(differing)})", pins)
    changed = _changed_units(held, pins.units)
    if changed:
        return _fresh(f"{len(changed)} pinned unit{'s' if len(changed) != 1 else ''} changed or missing: {changed[0]}", pins)
    stale = _unit_rows_off_the_pin(held)
    if stale:
        return _fresh(f"the ledger's unit {stale} is not the unit the pinned inputs hold", pins)
    prefix = [(name, i) for i, name in enumerate(names[:len(held.steps)])]
    if not held.steps or list(held.steps) != prefix or len(held.steps) >= len(names):
        listed = ", ".join(f"{n}#{i}" for n, i in held.steps) or "none"
        return _fresh(f"the committed Steps ({listed}) are not a proper prefix of the Steps", pins)
    last, nxt = held.steps[-1][0], names[len(held.steps)]
    # Every RESUME below must come after the code gate (a mid-loop resume of the `units` Step, #293, included): resuming after a change to a file of a
    # Step that already ran, wholly or in part, would mix two versions of its code in one graph.
    gated = _code_gate(pins, held, names, steps, changed_code, owners)
    if gated:
        return gated
    if nxt == "units" and held.unit_rows:  # inside the unit loop: it continues from the next unit
        return Verdict(RESUME, f"continuing the units Step after unit {len(held.unit_rows)} of {held.units_total}; the pinned inputs and the code are unchanged", held.pins)
    return Verdict(RESUME, f"continuing after the committed Step {last!r} with {nxt!r}; the pinned inputs and the code are unchanged", held.pins)


def _code_gate(pins: Pins, held: Held, names: list[str], steps, changed_code: list[str], owners) -> Verdict | None:
    """None when no code file changed (the caller resumes as usual); else a fresh verdict naming the file, or a resume verdict carrying the new code hashes
    and the changed files (the remaining Steps all run with the new code, so `build.run` takes it: build_ledger.record_code_change)."""
    if not changed_code:
        return None
    if owners is None:
        from .build_steps import owners_of  # here, not at the top: build_steps imports rebuild, which imports this module

        def owners(path: str) -> set[str]:
            return owners_of(path, steps)
    run = set(names[:len(held.steps)]) | set(held.partial)  # the Steps whose work is in the next database
    for path in changed_code:
        owned = owners(path)
        if owned >= set(names):
            return _fresh(f"code changed in {path}, a module every Step shares, so the build starts over: {_files(changed_code)}", pins, tuple(changed_code))
        if owned & run:
            return _fresh(f"code changed in {path}, which the Step {sorted(owned & run, key=names.index)[0]!r} already ran, so the build starts over: {_files(changed_code)}",
                          pins, tuple(changed_code))
    keep = replace(held.pins, code_version=pins.code_version, code_files=pins.code_files)
    last, nxt = held.steps[-1][0], names[len(held.steps)]
    return Verdict(RESUME, f"continuing after the committed Step {last!r} with {nxt!r}; code changed only in Steps not yet run: {_files(changed_code)}", keep, tuple(changed_code))


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


def _unit_rows_off_the_pin(held: Held) -> str | None:
    """The first committed unit (build.unit) whose path is not pinned, or whose manifest checksum differs from the pinned one: read from the pins the ledger
    holds, no file is hashed. Cannot happen in a ledger one build wrote; a tampered or mixed one is not resumed."""
    for path, checksum in held.unit_rows:
        if path not in held.pins.units or held.pins.units[path] != checksum:
            return path
    return None


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
            cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_schema = 'build' AND table_name = 'run' AND column_name = 'code_files'")
            if cur.fetchone()[0] != 1:
                return Held(None, None, [], frozenset(), "the build ledger was written before per-file code hashes")
            cur.execute("SELECT state, pinned_units, code_version, schema_files, today, pinned_quarantine, code_files FROM build.run")
            runs = cur.fetchall()
            if len(runs) != 1:
                return Held(None, None, [], frozenset(), f"the build ledger has {len(runs)} runs")
            state, units, code, schema, today, quarantine, files = runs[0]
            cur.execute("SELECT name, ordinal FROM build.step ORDER BY ordinal")
            steps = [(n, o) for n, o in cur.fetchall()]
            rows, total, quarantined = [], 0, frozenset()
            cur.execute("SELECT to_regclass('build.unit') IS NOT NULL")
            if cur.fetchone()[0]:  # the committed units (#293): the quarantined ones count as held whether or not their directory has moved yet
                cur.execute("SELECT path, manifest_sha256, units_total, quarantined_to FROM build.unit ORDER BY ordinal")
                units_rows = cur.fetchall()
                rows, total = [(p, sha) for p, sha, _, _ in units_rows], max((t for _, _, t, _ in units_rows), default=0)
                quarantined = frozenset(to for _, _, _, to in units_rows if to)
            snapshot_rows = False  # to_regclass: a build that has no such table has no such work
            cur.execute("SELECT to_regclass('build.snapshot') IS NOT NULL")
            if cur.fetchone()[0]:
                cur.execute("SELECT EXISTS (SELECT 1 FROM build.snapshot)")
                snapshot_rows = cur.fetchone()[0]
            return Held(Pins(units, code, schema, today, tuple(quarantine), files), state, steps, quarantined, unit_rows=tuple(rows), units_total=total,
                        snapshot_rows=snapshot_rows)
    except psycopg.Error as e:
        return Held(None, None, [], frozenset(), f"the next database could not be read: {type(e).__name__}")
