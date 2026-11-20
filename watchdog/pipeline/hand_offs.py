"""What one Step hands to a later one, persisted in the graph (spec #285, ticket #290).

`build.step` (sql/build_schema.sql) holds one row per Step, written in the rebuild's transaction when the Step finishes: its name, its position in
`STEPS`, and `summary`, a JSON object with the values the Step produced that no table of the graph holds. A later Step (or a resumed build, #295)
reads them back through the loaders below, never from a variable of the run that produced them. Values the graph already holds are loaded from
their own tables: ANAF's names (`core.anaf_company`), the loaded file hashes and the last source-file id (`seap.source_file`), SEAP's data-through
dates (`core.data_through`).

The JSON is deterministic (sorted keys, no timestamps: a `datetime` field is left out, a date is its ISO text), because `build` is part of the graph
the before/after comparisons dump. Paths are stored relative to the archive root.

A Step's later consumers read some rows through the loaders below (`onrc`, `units`). A RESUMED build (#292) also restores the `RebuildSummary` of the
Steps it skips from their rows (`restore_summary`), so it prints the same output lines as an uninterrupted run. The `placement-mf` row's observations and
entries are not restored (they lose their timestamps and tuple keys): no later Step reads them, and `line()` needs only the counts. Its size is a guess (no national build measured): check it with
`SELECT pg_column_size(summary) FROM build.step WHERE name = 'placement-mf'` at the next national rebuild."""
from __future__ import annotations

import json
import types
import typing
from collections import Counter
from dataclasses import fields, is_dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

from .bulk import KINDS
from .bulk.records import SetAside
from .identity import compare_name
from .onrc.build import OnrcSummary
from .onrc.people import PeopleSummary


class MissingHandOff(RuntimeError):
    """A Step needs a hand-off whose producer's `build.step` row is not there."""


def encode(value: Any, root: Path | None = None) -> Any:
    """`value` as JSON-ready data: dataclasses as objects (a `datetime` field is left out), dates as ISO text, paths relative to `root`, keys as text."""
    if is_dataclass(value) and not isinstance(value, type):
        return {f.name: encode(getattr(value, f.name), root) for f in fields(value) if not isinstance(getattr(value, f.name), datetime)}
    if isinstance(value, dict):
        return {str(k): encode(v, root) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [encode(v, root) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(encode(v, root) for v in value)
    if isinstance(value, datetime):
        raise TypeError("a timestamp does not belong in build.step")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Path):
        return value.relative_to(root).as_posix() if root and value.is_relative_to(root) else value.as_posix()
    return value


def write_step(cur: psycopg.Cursor, name: str, ordinal: int, summary: dict) -> None:
    """The Step's row; `summary` is JSON-ready (see `encode`). Keys are sorted by Postgres' jsonb on read, and by us on the way in."""
    cur.execute("INSERT INTO build.step (name, ordinal, summary) VALUES (%s, %s, %s)",
                (name, ordinal, Jsonb(json.loads(json.dumps(summary, sort_keys=True)))))


def read_step(cur: psycopg.Cursor, name: str) -> dict:
    """The summary a Step stored. Raises `MissingHandOff` when it has no row: a missing hand-off is never an empty one."""
    cur.execute("SELECT summary FROM build.step WHERE name = %s", (name,))
    row = cur.fetchone()
    if row is None:
        raise MissingHandOff(f"build.step has no row for the {name!r} Step: a later Step needs what it hands over, so the build cannot go on "
                             f"(the {name!r} Step did not finish, or its row was lost)")
    return row[0]


# ---- loaders: values the graph already holds ---------------------------------------------------------------------------------

def load_anaf_names(cur: psycopg.Cursor) -> dict[str, str]:
    """CUI -> compare name of every company ANAF's archived answers confirm (what the resolver asks): `core.anaf_company` holds exactly those."""
    cur.execute("SELECT cui, name FROM core.anaf_company")
    return {cui: compare_name(name) for cui, name in cur.fetchall()}


_ARCHIVE_KIND = {kind.label: key for key, kind in KINDS.items()}  # seap.source_file.kind holds the label (DA), the archive's directory the key (da)


def load_loaded_hashes(cur: psycopg.Cursor) -> set[tuple[str, str]]:
    """(archive kind, sha256) of the bulk files already loaded: what the duplicate check compares a file against. A crawled day's sha is its manifest's
    and a backfilled one is not a bulk file: neither takes part."""
    cur.execute("SELECT kind, sha256 FROM seap.source_file WHERE stream = 'bulk'")
    return {(_ARCHIVE_KIND[kind], sha) for kind, sha in cur.fetchall()}


def load_last_source_file_id(cur: psycopg.Cursor) -> int:
    """The last id handed out (0 when there is none): the ids are sequential, one per inserted file."""
    cur.execute("SELECT coalesce(max(id), 0) FROM seap.source_file")
    return cur.fetchone()[0]


def load_data_through(cur: psycopg.Cursor) -> dict[str, str]:
    """SEAP's data-through date per Record kind, as the signals and the status file take it."""
    cur.execute("SELECT kind, through::text FROM core.data_through WHERE source = 'SEAP'")
    return dict(cur.fetchall())


# ---- loaders: values in a Step's build.step row ------------------------------------------------------------------------------

def onrc_hand_off(summary: OnrcSummary | None) -> dict:
    """The `onrc` Step's row: an absent summary is the explicit `{"present": false}`."""
    return {"present": False} if summary is None else {"present": True, "summary": encode(summary)}


def load_onrc_summary(cur: psycopg.Cursor) -> OnrcSummary | None:
    """The `onrc` Step's `OnrcSummary` (with `entities_only` still 0: the entities Step counts them), or None when it says no ONRC summary is present.
    Raises `MissingHandOff` when the `onrc` row is missing: that is not the same as "no ONRC archive"."""
    row = read_step(cur, "onrc")
    if not row["present"]:
        return None
    data = dict(row["summary"])
    people = dict(data.pop("people"))
    if people["snapshot"] is not None:
        people["snapshot"] = date.fromisoformat(people["snapshot"])
    for key in ("first", "latest"):
        if data[key] is not None:
            data[key] = date.fromisoformat(data[key])
    return OnrcSummary(**data, people=PeopleSummary(**people))


def units_hand_off(files_loaded: int, bulk_rows: dict, duplicate_files: list, set_aside: list, quarantined: list, incomplete: list, root: Path, units_total: int = 0) -> dict:
    """The `units` Step's row: the summary fields it fills, and the two values the Coverage grid reads (`bulk_rows`, `set_aside`)."""
    return {
        "files_loaded": files_loaded,
        "units_total": units_total,  # what the unit loop planned: a resumed build that skips the Step gives the progress file its total
        "bulk_rows": [{"kind": kind, "quarter": list(quarter), "rows": rows} for (kind, quarter), rows in sorted(bulk_rows.items())],
        "duplicate_files": encode(duplicate_files, root),
        "set_aside": [{"path": encode(path, root), "line": a.line, "kind": a.kind, "rows": a.rows, "last_published": encode(a.last_published)} for path, a in set_aside],
        "quarantined": encode(quarantined, root),
        "incomplete": encode(incomplete, root),
    }


def load_bulk_rows(cur: psycopg.Cursor) -> dict[tuple[str, tuple[int, int]], int]:
    """(kind label, (year, quarter)) -> data rows of the largest bulk unit. Not `seap.source_file.row_count`: that counts loaded Records, this the rows read."""
    return {(x["kind"], tuple(x["quarter"])): x["rows"] for x in read_step(cur, "units")["bulk_rows"]}


def load_set_aside(cur: psycopg.Cursor, root: Path) -> list[tuple[Path, SetAside]]:
    """The files that switch kind partway, with the tail each one set aside, in the order the units were read."""
    return [(root / x["path"], SetAside(x["line"], x["kind"], x["rows"], date.fromisoformat(x["last_published"]) if x["last_published"] else None))
            for x in read_step(cur, "units")["set_aside"]]


def entities_hand_off(entities: int, onrc: OnrcSummary | None) -> dict:
    return {"entities": entities, "onrc_entities_only": None if onrc is None else onrc.entities_only}


# ---- a resume: the committed Steps and the summary they reported ---------------------------------------------------------------

def committed_steps(cur: psycopg.Cursor, steps) -> int:
    """How many Steps of `steps` are committed (their `build.step` rows), for a resume. The rows must be exactly the first N Steps, in order: a missing
    row among them (the `onrc` row lost, say) raises `MissingHandOff` naming it, never a silent re-run of a Step that is committed."""
    cur.execute("SELECT name, ordinal FROM build.step ORDER BY ordinal")
    rows = cur.fetchall()
    names = [s.name for s in steps]
    for ordinal, (name, row_ordinal) in enumerate(rows):
        if ordinal >= len(names) or (name, row_ordinal) != (names[ordinal], ordinal):
            missing = names[ordinal] if ordinal < len(names) else name
            raise MissingHandOff(f"build.step has no row for the {missing!r} Step, but later Steps are committed ({', '.join(r[0] for r in rows)}): "
                                 f"the build cannot resume from a ledger with a hole, and what the {missing!r} Step hands over is lost; rebuild with --fresh")
    return len(rows)


def _convert(tp, value: Any, root: Path | None) -> Any:
    """`value` (from `encode`d JSON) as the field type `tp` says: dates, paths (relative to `root`), nested dataclasses, Counters."""
    if value is None:
        return None
    origin = typing.get_origin(tp)
    args = typing.get_args(tp)
    if origin in (typing.Union, types.UnionType):
        return _convert(next(a for a in args if a is not type(None)), value, root)
    if tp is date:
        return date.fromisoformat(value)
    if tp is Path:
        return root / value if root else Path(value)
    if tp is Counter:
        return Counter(value)
    if is_dataclass(tp):
        return decode(tp, value, root)
    if origin is list and args:
        return [_convert(args[0], v, root) for v in value]
    return value


def decode(cls, data: dict, root: Path | None = None):
    """The inverse of `encode` for a dataclass `cls`: a field that `encode` left out (a datetime) or that `data` lacks keeps its default."""
    hints = typing.get_type_hints(cls)
    return cls(**{f.name: _convert(hints[f.name], data[f.name], root) for f in fields(cls) if f.name in data})


def restore_summary(cur: psycopg.Cursor, summary, steps, root: Path) -> None:
    """Fill `summary` (a `RebuildSummary`) with what the committed `steps` reported, so a resumed run prints what an uninterrupted one does. The Steps'
    `summary_fields` come from their rows; the `units`, `onrc` and `entities` hand-offs by their loaders."""
    hints = typing.get_type_hints(type(summary))
    done = {s.name for s in steps}
    for step in steps:
        row = read_step(cur, step.name)
        for name in step.summary_fields:
            setattr(summary, name, _convert(hints[name], row[name], root))
    if summary.signals:  # jsonb keeps no key order: the output lists the rules in the order of RULES
        from .signals import RULES  # here, not at the top: signals imports the whole rule set

        order = [r.SLUG for r in RULES]
        summary.signals = {slug: summary.signals[slug] for slug in order if slug in summary.signals}
    if "onrc" in done:
        summary.onrc = load_onrc_summary(cur)
    if "units" in done:
        row = read_step(cur, "units")
        summary.files_loaded = row["files_loaded"]
        summary.units_total = row.get("units_total", 0)
        summary.duplicate_files = [root / p for p in row["duplicate_files"]]
        summary.set_aside = load_set_aside(cur, root)
        summary.quarantined = [root / p for p in row["quarantined"]]
        summary.incomplete = [root / p for p in row["incomplete"]]
    if "entities" in done:
        row = read_step(cur, "entities")
        summary.entities = row["entities"]
        if summary.onrc is not None:
            summary.onrc.entities_only = row["onrc_entities_only"] or 0
