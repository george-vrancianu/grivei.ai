"""The MF step of `pipeline rebuild` (#80): the latest archived "Lista entitatilor publice" into `core.mf_entity` and `core.mf_snapshot`.

Reads only the archive (never the network). The newest snapshot that parses wins; a newer one that does not is named in the summary
(`skipped`), and the older one is used, so a broken upload never empties the Coverage denominator silently. Per entity:

- the CUI (`CIF Entitate Publica`) is normalised like an authority's key (no `RO`, no leading zeros); a row without one is dropped, a
  repeated CUI keeps its first row;
- the county is MF's `Judet` read as a county (the placement gazetteer's `county_of_name`: ASCII, `Bucuresti`, `Bistrita Nasaud`);
  a name that is no county leaves it null and the entity counts in no county (the summary says how many);
- `national` is the national-authority rule (placement/scope.py `decide`: the award notice, then the reviewed classification file): a
  ministry MF files under Bucuresti counts in National, not in a county.
"""
from __future__ import annotations

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Mapping

import psycopg

from ..archive import Archive, Unit
from ..placement.matching import Gazetteer, fold
from ..placement.scope import Entry, Observation, decide, read_classification, read_scopes
from ..placement.tables import load_gazetteer
from .fetch import KIND, SOURCE, STREAM

log = logging.getLogger("pipeline.mf")


class MfError(Exception):
    pass


@dataclass(frozen=True)
class MfRow:
    cui: str
    name: str
    county: str  # `Judet` as written
    uat: str


@dataclass
class MfSummary:
    snapshot: date | None = None
    entities: int = 0
    national: int = 0
    no_county: int = 0
    duplicates: int = 0
    unmatched: Counter = field(default_factory=Counter)  # `Judet` values that are no county (non-national rows), with their rows
    skipped: list[str] = field(default_factory=list)  # newer units that did not parse

    def _unmatched_text(self) -> str:
        top = self.unmatched.most_common(5)
        return " (" + ", ".join(f"{name or '(blank)'}: {n}" for name, n in top) + (", ..." if len(self.unmatched) > len(top) else "") + ")" if top else ""

    def line(self) -> str:
        if self.snapshot is None:
            return "mf list: none archived (run `pipeline fetch-mf`): the Coverage denominator is empty" + "".join(f"; skipped {s}" for s in self.skipped)
        return (f"mf list: snapshot {self.snapshot}, {self.entities} public entities, {self.national} national, {self.no_county} without a county{self._unmatched_text()}"
                + (f", {self.duplicates} repeated CUIs dropped" if self.duplicates else "") + "".join(f"; skipped {s}" for s in self.skipped))


def normalise_cui(value: object) -> str:
    """`'1767070'`, `1767070.0`, `'RO 1767070'`, `'01767070'` -> `'1767070'`; '' when there is no number in it."""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return re.sub(r"\D", "", re.sub(r"^\s*RO", "", str(value or ""), flags=re.I)).lstrip("0")


_HEADERS = {"county": "JUDET", "cui": "CIF ENTITATE PUBLICA", "name": "DENUMIRE ENTITATE PUBLICA", "uat": "DENUMIRE UAT"}


def _sheet_rows(path: Path) -> list[list]:
    if path.suffix.lower() == ".xlsx":
        from openpyxl import load_workbook

        wb = load_workbook(path, read_only=True, data_only=True)
        return [list(row) for row in wb.worksheets[0].iter_rows(values_only=True)]
    import xlrd  # the real file is a legacy .xls

    sheet = xlrd.open_workbook(str(path)).sheet_by_index(0)
    return [sheet.row_values(r) for r in range(sheet.nrows)]


def read_list(path: Path) -> list[MfRow]:
    """The rows of one MF file. The header row is found by its column names (folded, so a changed accent or spacing still matches);
    a file without the county, CUI or name column is an `MfError`."""
    rows = _sheet_rows(path)
    for index, row in enumerate(rows[:10]):
        folded = [fold(str(c)) if c is not None else "" for c in row]
        columns = {key: next((i for i, h in enumerate(folded) if h.startswith(prefix)), None) for key, prefix in _HEADERS.items()}
        if all(columns[k] is not None for k in ("county", "cui", "name")):
            break
    else:
        raise MfError(f"{path.name}: no header row with Judet, CIF Entitate Publica and Denumire Entitate Publica")
    out = []
    for row in rows[index + 1:]:
        cell = lambda key: str(row[columns[key]]).strip() if columns[key] is not None and columns[key] < len(row) and row[columns[key]] is not None else ""  # noqa: E731
        cui = normalise_cui(row[columns["cui"]] if columns["cui"] < len(row) else "")
        if cui:
            out.append(MfRow(cui, cell("name"), cell("county"), cell("uat")))
    return out


def snapshot_of(unit: Unit) -> date | None:
    try:
        return date.fromisoformat(unit.unit)
    except ValueError:
        return None


def latest_units(archive: Archive) -> list[Unit]:
    """The MF units, newest snapshot first, then newest fetch first."""
    units = [u for u in archive.units(SOURCE) if (u.source, u.stream, u.kind) == (SOURCE, STREAM, KIND) and snapshot_of(u) is not None]  # a stray directory is no snapshot
    return sorted(units, key=lambda u: (u.unit, u.fetched_at, str(u.path)), reverse=True)


def classify(rows: list[MfRow], gaz: Gazetteer, observations: Mapping[str, Observation], entries: Mapping[str, Entry]) -> tuple[list[tuple], MfSummary]:
    """Rows for `core.mf_entity`: (cui, name, county_iso, uat_name, national, national_by)."""
    out, seen, summary = [], set(), MfSummary()
    for r in rows:
        if r.cui in seen:
            summary.duplicates += 1
            continue
        seen.add(r.cui)
        county = gaz.county_of_name(r.county)
        national, by = decide(r.cui, observations.get(r.cui), entries)
        summary.entities += 1
        summary.national += national
        if county is None and not national:
            summary.no_county += 1
            summary.unmatched[r.county] += 1
        out.append((r.cui, r.name, county, r.uat or None, national, by))
    return out, summary


def build_mf(cur: psycopg.Cursor, archive: Archive, data_dir: Path | str | None = None, observations: Mapping[str, Observation] | None = None,
             entries: Mapping[str, Entry] | None = None) -> MfSummary:
    """`observations` and `entries` are the national-authority inputs the placement step already read (read here when not given)."""
    skipped: list[str] = []
    for unit in latest_units(archive):
        name = next((f for f in unit.files if f.lower().endswith((".xls", ".xlsx"))), None)
        try:
            if name is None:
                raise MfError("no .xls or .xlsx file in the unit")
            rows = read_list(unit.file_path(name))
            if not rows:
                raise MfError("no rows")
        except Exception as e:  # noqa: BLE001 - a broken upload must not stop the rebuild; an older snapshot is used and the line says so
            skipped.append(f"{unit.unit} ({unit.path.relative_to(archive.root)}): {e}")
            log.warning("mf list %s skipped: %s", unit.path, e)
            continue
        gaz, _ = load_gazetteer(data_dir)
        data, summary = classify(rows, gaz, observations if observations is not None else read_scopes(archive),
                                 entries if entries is not None else read_classification(data_dir))
        summary.snapshot, summary.skipped = snapshot_of(unit), skipped
        cur.execute("INSERT INTO core.mf_snapshot (snapshot_date, fetched_at, archive_path, entities) VALUES (%s, %s, %s, %s)",
                    (summary.snapshot, unit.fetched_at, str((unit.path / name).relative_to(archive.root)), summary.entities))
        cur.executemany("INSERT INTO core.mf_entity (cui, name, county_iso, uat_name, national, national_by) VALUES (%s, %s, %s, %s, %s, %s)", data)
        if summary.no_county:
            log.warning("mf list: %d entities have a Judet that is no county; they count in no county's M: %s", summary.no_county, dict(summary.unmatched.most_common(10)))
        return summary
    return MfSummary(skipped=skipped)
