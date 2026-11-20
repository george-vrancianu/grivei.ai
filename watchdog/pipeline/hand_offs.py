"""What one Step hands to a later one, persisted in the graph (spec #285, ticket #290).

`build.step` (sql/build_schema.sql) holds one row per Step, written in the rebuild's transaction when the Step finishes: its name, its position in
`STEPS`, and `summary`, a JSON object with the values the Step produced that no table of the graph holds. A later Step (or a resumed build, #295)
reads them back through the loaders below, never from a variable of the run that produced them. Values the graph already holds are loaded from
their own tables: ANAF's names (`core.anaf_company`), the loaded file hashes and the last source-file id (`seap.source_file`), SEAP's data-through
dates (`core.data_through`).

The JSON is deterministic (sorted keys, no timestamps: a `datetime` field is left out, a date is its ISO text), because `build` is part of the graph
the before/after comparisons dump. Paths are stored relative to the archive root."""
from __future__ import annotations

import json
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


def units_hand_off(files_loaded: int, bulk_rows: dict, duplicate_files: list, set_aside: list, quarantined: list, incomplete: list, root: Path) -> dict:
    """The `units` Step's row: the summary fields it fills, and the two values the Coverage grid reads (`bulk_rows`, `set_aside`)."""
    return {
        "files_loaded": files_loaded,
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
