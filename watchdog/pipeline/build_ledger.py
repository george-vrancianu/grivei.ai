"""The build ledger (spec #285, ticket #291): the record inside a built graph of how it was built (`build.run`, and the times on each `build.step` row).

A Step's `build.step` row is written in the transaction of the Step's own work (build_steps.run_steps), so in a staged build (beside the live graph) a
row means the Step is committed. The ledger says the build is complete only when the last Step's transaction sets `build.run.state` to 'complete';
`ledger_failures` is what a Switchover asks of a next database before it swaps it in. The Steps' hand-off values live in hand_offs.py (same table).
"""
from __future__ import annotations

from datetime import datetime, timezone

import psycopg
from psycopg.types.json import Jsonb

from .pins import Pins

BUILDING, COMPLETE = "building", "complete"


def start_run(cur: psycopg.Cursor, staged: bool, pins: Pins) -> None:
    """The run's one row, in the schema Step (after build_schema.sql has recreated the `build` schema), with the pinned inputs of the run."""
    cur.execute("INSERT INTO build.run (started, state, staged, pinned_units, code_version, schema_files, today) VALUES (clock_timestamp(), %s, %s, %s, %s, %s, %s)",
                (BUILDING, staged, Jsonb(dict(pins.units)), pins.code_version, Jsonb(dict(pins.schema_files)), pins.today))


def stamp_step(cur: psycopg.Cursor, name: str, started: datetime) -> None:
    """The times of a Step's row (written just before by `hand_offs.write_step`): when it started, and now."""
    cur.execute("UPDATE build.step SET started = %s, ended = clock_timestamp() WHERE name = %s", (started, name))


def finish_run(cur: psycopg.Cursor) -> None:
    """Mark the build complete: called in the transaction of the last Step, so the state and that Step's row commit together."""
    cur.execute("UPDATE build.run SET state = %s, ended = clock_timestamp() WHERE one", (COMPLETE,))


def now() -> datetime:
    return datetime.now(timezone.utc)


def ledger_failures(cur: psycopg.Cursor, step_names: list[str]) -> list[str]:
    """Why the ledger of the connected database does not show a complete build (empty = it does): `step_names` are the Steps of `STEPS`, in order."""
    cur.execute("SELECT to_regclass('build.run') IS NOT NULL AND to_regclass('build.step') IS NOT NULL")
    if not cur.fetchone()[0]:
        return ["no build ledger (the build schema is missing: a graph built before the ledger, or a build that never got past its first Step)"]
    cur.execute("SELECT state FROM build.run")
    runs = cur.fetchall()
    if len(runs) != 1:
        return [f"the build ledger has {len(runs)} runs, expected 1"]
    failures = []
    if runs[0][0] != COMPLETE:
        failures.append(f"the build is not complete (build.run state {runs[0][0]!r})")
    cur.execute("SELECT name, ordinal FROM build.step ORDER BY ordinal")
    rows = cur.fetchall()
    if rows != [(name, ordinal) for ordinal, name in enumerate(step_names)]:
        failures.append(f"the build ledger lists {len(rows)} Steps ({', '.join(r[0] for r in rows) or 'none'}), expected {len(step_names)} in order: "
                        f"{', '.join(step_names)}")
    return failures
