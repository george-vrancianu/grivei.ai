"""`pipeline geo-table`: the checked-in UAT and village tables, generated from the archived geography snapshots.

Reads the latest complete SIRUTA, Wikidata and ANCPI units of the raw archive (never the network) and writes, into the placement
data directory (`placement/tables.py`):

- `uats.csv`: one row per UAT and per Bucharest sector: `siruta, county_iso, siruta_jud, tip, name` (display, comma-below, no
  MUNICIPIUL/ORAS), `name_folded` (the matching key), `lon, lat`, `point_source` (`wikidata` | `ancpi_pos`).
- `villages.csv`: SIRUTA's NIV=3 localities of those UATs: `siruta, uat_siruta, name, name_folded, postal_code` (CODP).
- `table-sources.json`: which snapshots (path, sha256) the tables were made from, and the attributions.

SIRUTA: NIV=2 (TIP 1, 2, 3, 4; not TIP 9, Municipiul Bucuresti) are the UATs; the six Bucharest sectors are NIV=3 TIP=6 and
become UATs of county `B`; the other NIV=3 rows are villages. Point: a Wikidata point is accepted only when it lies inside the
ANCPI polygon with the same SIRUTA (`nationalCode`); otherwise the polygon's point on surface. A UAT with no polygon keeps no
point (the row stays, lon/lat empty) and is reported. Several Wikidata items for one code: the lowest Q-number inside the polygon.
"""
from __future__ import annotations

import csv
import io
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from ..archive import Archive, Unit, sha256_of
from ..placement.matching import SECTOR_OF, bare_uat_name, display_name, fold
from ..placement.tables import DEFAULT_DATA_DIR, UAT_COLUMNS, VILLAGE_COLUMNS, read_counties

BUCHAREST_SIRUTA = "179132"


class TableError(RuntimeError):
    pass


@dataclass
class TableSummary:
    uats: int = 0
    villages: int = 0
    wikidata_points: int = 0
    ancpi_points: int = 0
    no_point: list[str] = field(default_factory=list)
    wikidata_rejected: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"geo-table {self.uats} UATs ({self.wikidata_points} Wikidata points, {self.ancpi_points} ANCPI points on surface, "
               f"{len(self.no_point)} without a point), {self.villages} villages"]
        out += [f"geo-table no ANCPI polygon, no point: {s}" for s in self.no_point]
        out += [f"geo-table Wikidata point outside the ANCPI polygon, replaced: {s}" for s in self.wikidata_rejected]
        return out


def latest_unit(archive: Archive, stream: str, kind: str) -> Unit:
    units = [u for u in archive.units() if (u.source, u.stream, u.kind) == ("geo", stream, kind)]
    if not units:
        raise TableError(f"no archived geo/{stream}/{kind} snapshot: run `pipeline geo-fetch` first")
    return max(units, key=lambda u: (u.fetched_at, str(u.path)))


def read_siruta(unit: Unit) -> list[dict[str, str]]:
    path = unit.file_path(unit.files[0])
    text = path.read_bytes().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text), delimiter=";"))
    need = {"SIRUTA", "DENLOC", "CODP", "JUD", "SIRSUP", "TIP", "NIV"}
    if not rows or not need <= set(rows[0]):
        raise TableError(f"{path}: not a SIRUTA CSV (columns {sorted(rows[0]) if rows else []})")
    return rows


def read_wikidata(unit: Unit) -> dict[str, list[tuple[int, float, float]]]:
    """SIRUTA -> [(Q number, lon, lat)] of the items with a coordinate (`Point(lon lat)`)."""
    import re

    doc = json.loads(unit.file_path("points.json").read_bytes())
    out: dict[str, list[tuple[int, float, float]]] = {}
    for b in doc["results"]["bindings"]:
        coord = (b.get("coord") or {}).get("value", "")
        m = re.match(r"Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)", coord)
        q = re.search(r"Q(\d+)$", b["item"]["value"])
        if m and q:
            out.setdefault(str(b["siruta"]["value"]).strip(), []).append((int(q[1]), float(m[1]), float(m[2])))
    for items in out.values():
        items.sort()
    return out


def iter_polygons(unit: Unit):
    """(SIRUTA, shapely geometry) of every ANCPI feature, one page in memory at a time."""
    from shapely.geometry import shape

    for name in sorted(unit.files):
        doc = json.loads(unit.file_path(name).read_bytes())
        for feature in doc.get("features") or []:
            code = str((feature.get("properties") or {}).get("nationalCode") or "").strip()
            if not code or not feature.get("geometry"):
                continue
            geom = shape(feature["geometry"])
            if not geom.is_valid:
                geom = geom.buffer(0)
            yield code, geom


def build_tables(archive: Archive, out_dir: Path | str | None = None, data_dir: Path | str | None = None,
                 say: Callable[[str], None] = lambda _: None) -> TableSummary:
    from shapely.geometry import Point

    out = Path(out_dir) if out_dir else DEFAULT_DATA_DIR
    counties = read_counties(Path(data_dir) if data_dir else DEFAULT_DATA_DIR)
    iso_by_jud = {c.siruta_jud: c.iso for c in counties}
    siruta_unit, wiki_unit, ancpi_unit = (latest_unit(archive, "siruta", "csv"), latest_unit(archive, "wikidata", "siruta-points"),
                                          latest_unit(archive, "ancpi", "uat-polygons"))
    rows = read_siruta(siruta_unit)
    # the county table is checked in; SIRUTA's own county rows must agree with it
    for r in rows:
        if r["NIV"] == "1" and r["TIP"] == "40":
            iso = iso_by_jud.get(r["JUD"].strip())
            name = fold(r["DENLOC"]).removeprefix("JUDETUL ").removeprefix("MUNICIPIUL ")
            expected = next((fold(c.name) for c in counties if c.iso == iso), None)
            if iso is None or expected != name:
                raise TableError(f"counties.csv disagrees with SIRUTA: JUD {r['JUD']} is {r['DENLOC']!r}, the table says {iso} {expected!r}")

    uats: dict[str, dict] = {}
    villages: list[dict] = []
    for r in rows:
        siruta, niv, tip, jud = r["SIRUTA"].strip(), r["NIV"].strip(), r["TIP"].strip(), r["JUD"].strip()
        iso = iso_by_jud.get(jud)
        if tip == "6" and siruta in SECTOR_OF:  # whichever NIV the file gives them: the six sectors are known by SIRUTA code
            uats[siruta] = {"siruta": siruta, "county_iso": "B", "siruta_jud": jud, "tip": "6", "name": f"Sector {SECTOR_OF[siruta]}",
                            "name_folded": f"SECTOR {SECTOR_OF[siruta]}"}
        elif niv == "2" and tip != "9" and iso:
            uats[siruta] = {"siruta": siruta, "county_iso": iso, "siruta_jud": jud, "tip": tip, "name": display_name(r["DENLOC"]),
                            "name_folded": bare_uat_name(r["DENLOC"])}
    for r in rows:
        if r["NIV"].strip() == "3" and r["TIP"].strip() != "6" and r["SIRSUP"].strip() in uats:
            code = r["CODP"].strip()
            villages.append({"siruta": r["SIRUTA"].strip(), "uat_siruta": r["SIRSUP"].strip(), "name": display_name(r["DENLOC"]),
                             "name_folded": fold(r["DENLOC"]), "postal_code": "" if code in ("", "0") else code})

    wikidata = read_wikidata(wiki_unit)
    summary = TableSummary(uats=len(uats), villages=len(villages))
    points: dict[str, tuple[float, float, str]] = {}
    for code, geom in iter_polygons(ancpi_unit):
        if code not in uats or code in points:
            continue
        chosen = next(((lon, lat) for _, lon, lat in wikidata.get(code, []) if geom.covers(Point(lon, lat))), None)
        if chosen:
            points[code] = (*chosen, "wikidata")
            summary.wikidata_points += 1
        else:
            if wikidata.get(code):
                summary.wikidata_rejected.append(code)
            p = geom.representative_point()
            points[code] = (p.x, p.y, "ancpi_pos")
            summary.ancpi_points += 1
    summary.no_point = sorted(set(uats) - set(points), key=int)

    out.mkdir(parents=True, exist_ok=True)
    _write_csv(out / "uats.csv", UAT_COLUMNS, [
        {**u, "lon": f"{points[s][0]:.6f}" if s in points else "", "lat": f"{points[s][1]:.6f}" if s in points else "",
         "point_source": points[s][2] if s in points else ""}
        for s, u in sorted(uats.items(), key=lambda kv: int(kv[0]))])
    _write_csv(out / "villages.csv", VILLAGE_COLUMNS, sorted(villages, key=lambda v: int(v["siruta"])))
    sources = {
        "snapshots": {k: {"path": str(u.path.relative_to(archive.root)), "fetchedAt": u.fetched_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                          "files": {n: sha256_of(u.file_path(n)) for n in u.files}}
                      for k, u in (("siruta", siruta_unit), ("wikidata", wiki_unit), ("ancpi", ancpi_unit))},
        "counts": {"uats": summary.uats, "villages": summary.villages, "wikidata": summary.wikidata_points, "ancpi_pos": summary.ancpi_points},
        "attribution": ["SIRUTA: INS, CC BY 4.0", "Limite UAT: ANCPI, CC BY 4.0", "Wikidata coordinates: CC0"],
    }
    (out / "table-sources.json").write_text(json.dumps(sources, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return summary


def _write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    tmp = path.with_suffix(".csv.tmp")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, lineterminator="\n", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp, path)
