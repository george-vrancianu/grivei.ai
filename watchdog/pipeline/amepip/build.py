"""The AMEPIP step of `pipeline rebuild` (#183): the newest archived list into `amepip.snapshot` and `amepip.enterprise`.

Reads only the archive (never the network). The newest unit that parses wins; a newer one that does not is named in the summary (`skipped`)
and the older one is used, so a broken upload never empties the flag silently. `matched` is how many of the list's CUIs are entities of the
graph (the flag is the join of `core.entity.key` and `amepip.enterprise.cui`, read when the entity page asks).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import psycopg

from ..archive import Archive, Unit
from .fetch import KIND, SOURCE, STREAM
from .read import AmepipEnterprise, read_list

log = logging.getLogger("pipeline.amepip")


@dataclass
class AmepipSummary:
    snapshot: date | None = None
    enterprises: int = 0
    matched: int = 0
    skipped: list[str] = field(default_factory=list)  # newer units that did not parse

    def line(self) -> str:
        skipped = "".join(f"; skipped {s}" for s in self.skipped)
        if self.snapshot is None:
            return "amepip list: none archived (run `pipeline fetch-amepip`): no entity is flagged a public enterprise" + skipped
        return f"amepip list: snapshot {self.snapshot}, {self.enterprises} public enterprises, {self.matched} of them entities of the graph" + skipped


def snapshot_of(unit: Unit) -> date | None:
    try:
        return date.fromisoformat(unit.unit)
    except ValueError:
        return None


def latest_units(archive: Archive) -> list[Unit]:
    """The AMEPIP units, newest snapshot first, then newest fetch first. Only AMEPIP's directories are read (hashed)."""
    root = archive.root / SOURCE
    kept = archive.survey(keep=lambda d: d.is_relative_to(root))
    units = [u for u, _ in kept if u is not None and (u.source, u.stream, u.kind) == (SOURCE, STREAM, KIND) and snapshot_of(u) is not None]
    return sorted(units, key=lambda u: (u.unit, u.fetched_at, str(u.path)), reverse=True)


def list_file(unit: Unit) -> str | None:
    return next((f for f in unit.files if f.lower().endswith((".xlsx", ".xls", ".csv"))), None)


def newest_list(archive: Archive) -> tuple[Unit, str, list[AmepipEnterprise], list[str]] | None:
    """The newest unit that parses, its file name, its enterprises and what was skipped before it; None when nothing parses."""
    skipped: list[str] = []
    for unit in latest_units(archive):
        name = list_file(unit)
        try:
            if name is None:
                raise ValueError("no .xlsx, .xls or .csv file in the unit")
            rows = read_list(unit.file_path(name))
            if not rows:
                raise ValueError("no rows")
        except Exception as e:  # noqa: BLE001 - a broken upload must not stop the rebuild; an older list is used and the line says so
            skipped.append(f"{unit.unit} ({unit.path.relative_to(archive.root)}): {e}")
            log.warning("amepip list %s skipped: %s", unit.path, e)
            continue
        return unit, name, rows, skipped
    return None


def build_amepip(cur: psycopg.Cursor, archive: Archive) -> AmepipSummary:
    found = newest_list(archive)
    if found is None:
        return AmepipSummary(skipped=[f"{u.unit} ({u.path.relative_to(archive.root)})" for u in latest_units(archive)])
    unit, name, rows, skipped = found
    origin = unit.origin or {}
    snapshot = snapshot_of(unit)
    cur.execute("INSERT INTO amepip.snapshot (snapshot_date, fetched_at, archive_path, dataset_url, via, license, enterprises) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (snapshot, unit.fetched_at, str((unit.path / name).relative_to(archive.root)), origin.get("datasetUrl"), unit.via, origin.get("license"), len(rows)))
    cur.executemany("INSERT INTO amepip.enterprise (cui, name, registration_number, status, first_year, last_year, snapshot_date) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    [(r.cui, r.name, r.registration_number, r.status, r.first_year, r.last_year, snapshot) for r in rows])
    cur.execute("SELECT count(*) FROM core.entity e JOIN amepip.enterprise a ON a.cui = e.key")
    return AmepipSummary(snapshot, len(rows), cur.fetchone()[0], skipped)
