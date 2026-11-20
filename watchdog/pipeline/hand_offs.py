"""What one Step hands to a later one, persisted in the graph (spec #285, ticket #290).

`build.step` (sql/build_schema.sql) holds one row per Step, written in the rebuild's transaction when the Step finishes (the unit loop's per-unit lists are in `build.unit`, one row per unit, committed with it): its name, its position in
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
from dataclasses import dataclass, field, fields, is_dataclass
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


def units_hand_off(files_loaded: int, incomplete: list, root: Path, units_total: int = 0) -> dict:
    """The `units` Step's row: the scalar counts and the incomplete listing. The per-unit lists (duplicate files, set aside, quarantined, the bulk row
    counts the Coverage grid reads) are in `build.unit`, their one source (#293): the Step commits each unit with its row, so a Step row would only repeat them."""
    return {
        "files_loaded": files_loaded,
        "units_total": units_total,  # what the unit loop planned: a resumed build that skips the Step gives the progress file its total
        "incomplete": encode(incomplete, root),
    }


def load_bulk_rows(cur: psycopg.Cursor) -> dict[tuple[str, tuple[int, int]], int]:
    """(kind label, (year, quarter)) -> data rows of the largest bulk unit (from `build.unit`). Not `seap.source_file.row_count`: that counts loaded Records, this the rows read."""
    cur.execute("SELECT bulk_kind, bulk_year, bulk_quarter, max(rows) FROM build.unit WHERE bulk_kind IS NOT NULL GROUP BY 1, 2, 3")
    return {(kind, (year, quarter)): rows for kind, year, quarter, rows in cur.fetchall()}


def load_set_aside(cur: psycopg.Cursor, root: Path) -> list[tuple[Path, SetAside]]:
    """The files that switch kind partway, with the tail each one set aside, in the order the units were read (`build.unit` in ordinal order)."""
    return _set_aside_of(load_units(cur), root)


def entities_hand_off(entities: int, onrc: OnrcSummary | None) -> dict:
    return {"entities": entities, "onrc_entities_only": None if onrc is None else onrc.entities_only}


# ---- build.unit: one row per Raw archive unit the unit loop finished (#293) -------------------------------------------------------

@dataclass
class UnitRow:
    """What the unit loop records about one unit, in the unit's own transaction (sql/build_schema.sql `build.unit`). Paths are relative to the archive root."""
    ordinal: int
    path: str
    manifest_sha256: str | None
    status: str  # 'loaded' | 'skipped' | 'quarantined'
    units_total: int
    reason: str | None = None
    files: int = 0
    rows: int = 0
    records: int = 0
    files_loaded: int = 0
    bulk: tuple[str, tuple[int, int]] | None = None  # a loaded bulk unit's Coverage cell: (kind label, (year, quarter))
    duplicate_files: list[str] = field(default_factory=list)
    set_aside: list[dict] = field(default_factory=list)  # [{"path", "line", "kind", "rows", "last_published"}]
    quarantined_to: str | None = None
    problems: list[str] = field(default_factory=list)


def set_aside_json(set_aside: list[tuple[Path, SetAside]], root: Path) -> list[dict]:
    return [{"path": encode(path, root), "line": a.line, "kind": a.kind, "rows": a.rows, "last_published": encode(a.last_published)} for path, a in set_aside]


def _set_aside_of(rows: list[UnitRow], root: Path) -> list[tuple[Path, SetAside]]:
    return [(root / x["path"], SetAside(x["line"], x["kind"], x["rows"], date.fromisoformat(x["last_published"]) if x["last_published"] else None))
            for row in rows for x in row.set_aside]


def write_unit(cur: psycopg.Cursor, row: UnitRow) -> None:
    """The unit's row: written in the unit's transaction, so it exists exactly when the unit's source_file, record and search rows do."""
    kind, (year, quarter) = row.bulk if row.bulk else (None, (None, None))
    cur.execute(
        "INSERT INTO build.unit (ordinal, path, manifest_sha256, status, reason, units_total, files, rows, records, files_loaded, bulk_kind, bulk_year, bulk_quarter, "
        "duplicate_files, set_aside, quarantined_to, problems) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (row.ordinal, row.path, row.manifest_sha256, row.status, row.reason, row.units_total, row.files, row.rows, row.records, row.files_loaded, kind, year, quarter,
         Jsonb(row.duplicate_files), Jsonb(row.set_aside), row.quarantined_to, Jsonb(row.problems)))


def load_units(cur: psycopg.Cursor) -> list[UnitRow]:
    """The committed units, in unit order. They are always units 1..N (the loop commits in order): anything else is a ledger with a hole, which raises."""
    cur.execute("SELECT ordinal, path, manifest_sha256, status, units_total, reason, files, rows, records, files_loaded, bulk_kind, bulk_year, bulk_quarter, "
                "duplicate_files, set_aside, quarantined_to, problems FROM build.unit ORDER BY ordinal")
    out = [UnitRow(o, path, sha, status, total, reason, files, rows, records, loaded, (kind, (year, quarter)) if kind else None, dups, aside, to, problems)
           for o, path, sha, status, total, reason, files, rows, records, loaded, kind, year, quarter, dups, aside, to, problems in cur.fetchall()]
    if [r.ordinal for r in out] != list(range(1, len(out) + 1)):
        raise MissingHandOff(f"build.unit holds units {[r.ordinal for r in out][:8]}..., not 1..{len(out)}: the build cannot resume from a ledger with a hole; rebuild with --fresh")
    return out


def unit_counts(rows: list[UnitRow]) -> dict[str, int]:
    """The progress counters after the committed units (`Progress.restore_units`): the last unit's position, the outcomes, the Records loaded."""
    return {"done": len(rows), "loaded": sum(r.status == "loaded" for r in rows), "skipped": sum(r.status == "skipped" for r in rows),
            "quarantined": sum(r.status == "quarantined" for r in rows), "records": sum(r.records for r in rows if r.status == "loaded")}


def restore_units(summary, rows: list[UnitRow], root: Path) -> None:
    """The `RebuildSummary` fields the committed units fill, in unit order, so a resumed run prints what an uninterrupted one does. Assigns: a resumed unit
    loop then goes on from here (`files_loaded`, `duplicate_files`, `set_aside` and `quarantined` grow with each later unit)."""
    summary.files_loaded = sum(r.files_loaded for r in rows)
    summary.duplicate_files = [root / p for r in rows for p in r.duplicate_files]
    summary.set_aside = _set_aside_of(rows, root)
    summary.quarantined = [root / r.quarantined_to for r in rows if r.quarantined_to]


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
        restore_units(summary, load_units(cur), root)
        summary.units_total = row.get("units_total", 0)
        summary.incomplete = [root / p for p in row["incomplete"]]
    if "entities" in done:
        row = read_step(cur, "entities")
        summary.entities = row["entities"]
        if summary.onrc is not None:
            summary.onrc.entities_only = row["onrc_entities_only"] or 0
