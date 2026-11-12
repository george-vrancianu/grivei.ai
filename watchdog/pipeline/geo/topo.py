"""County and UAT outlines as static TopoJSON, built at load time from the archived ANCPI polygons (#67). Never through GraphQL.

Output directory (`--geo-dir` / `PIPELINE_GEO_DIR`, default `<archive>/derived/geo`; never the repo):

    counties.topo.json        object `counties`: one feature per county, the dissolved UATs; properties {code: "RO-BV", name: "Brașov"}
    uats/RO-BV.topo.json      object `uats`: the county's UATs; properties {code: "<SIRUTA>", name}
    uats/RO-B.topo.json       object `sectors`: Bucharest's six sectors (it has no UAT of its own on the map)
    index.json                where it came from (the ANCPI snapshot), counts

The shape is the one `BaseMap` / `ZoomedCountyMap` read (`packages/ui` samples/geo): a GeometryCollection per object, the key in
`properties.code`, the label in `properties.name`, exterior rings clockwise (d3-geo). Counties are dissolved at ANCPI's
resolution, the gaps the per-feature generalisation leaves between neighbours are closed (`closing`) and the result is
simplified (`simplify`), both in degrees. Coordinates are quantised to 1e-5 degrees (about 1 m); every ring is its own arc (no
arc sharing), which `topojson-client` reads like any other.
"""
from __future__ import annotations

import json
import os
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from ..archive import Archive
from ..placement.tables import DEFAULT_DATA_DIR, read_counties, read_uat_rows
from .table import iter_polygons, latest_unit

QUANT = 1e-5
CLOSING = 0.0008
SIMPLIFY = 0.0004


@dataclass
class TopoSummary:
    counties: int = 0
    uats: int = 0
    files: int = 0
    skipped: str | None = None

    def line(self) -> str:
        return self.skipped or f"geo: {self.counties} county outlines and {self.uats} UAT outlines in {self.files} TopoJSON file(s)"


def _polygons(geom):
    from shapely.geometry import MultiPolygon, Polygon

    if isinstance(geom, Polygon):
        return [geom] if not geom.is_empty else []
    if isinstance(geom, MultiPolygon) or hasattr(geom, "geoms"):
        return [p for g in geom.geoms for p in _polygons(g)]
    return []


def encode(objects: dict[str, list[tuple[dict, object]]]) -> dict:
    """A TopoJSON topology from `{object name: [(properties, shapely geometry)]}`: quantised, delta-encoded, one arc per ring."""
    from shapely.geometry.polygon import orient

    polys = [(name, props, [orient(p, sign=-1.0) for p in _polygons(g)]) for name, items in objects.items() for props, g in items]
    xs = [x for _, _, ps in polys for p in ps for x, _y in p.exterior.coords]
    ys = [y for _, _, ps in polys for p in ps for _x, y in p.exterior.coords]
    tx, ty = (min(xs), min(ys)) if xs else (0.0, 0.0)
    arcs: list[list[list[int]]] = []

    def ring(coords) -> list[int] | None:
        pts: list[tuple[int, int]] = []
        for x, y in coords:
            q = (round((x - tx) / QUANT), round((y - ty) / QUANT))
            if not pts or q != pts[-1]:
                pts.append(q)
        if len(pts) < 4 or pts[0] != pts[-1]:
            return None
        encoded = [list(pts[0])] + [[pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]] for i in range(1, len(pts))]
        arcs.append(encoded)
        return [len(arcs) - 1]

    out_objects: dict[str, dict] = {}
    collections: dict[str, list[dict]] = {name: [] for name in objects}
    for name, props, parts in polys:
        shaped = []
        for p in parts:
            exterior = ring(p.exterior.coords)
            if exterior is not None:
                shaped.append([exterior, *(r for h in p.interiors if (r := ring(h.coords)) is not None)])
        if not shaped:
            continue
        geometry = {"type": "Polygon", "arcs": shaped[0]} if len(shaped) == 1 else {"type": "MultiPolygon", "arcs": shaped}
        collections[name].append({**geometry, "properties": props})
    for name, geometries in collections.items():
        out_objects[name] = {"type": "GeometryCollection", "geometries": geometries}
    return {"type": "Topology", "transform": {"scale": [QUANT, QUANT], "translate": [tx, ty]}, "objects": out_objects, "arcs": arcs}


def _write(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def build_topojson(archive: Archive, out_dir: Path | str, data_dir: Path | str | None = None, *, closing: float = CLOSING,
                   simplify: float = SIMPLIFY, say: Callable[[str], None] = lambda _: None) -> TopoSummary:
    """Dissolve and write. Skips (with the reason in `skipped`) when the archive has no ANCPI snapshot or the data directory no UAT table."""
    from shapely import union_all

    base = Path(data_dir) if data_dir else DEFAULT_DATA_DIR
    uat_rows = {r["siruta"]: r for r in read_uat_rows(base)}
    if not uat_rows:
        return TopoSummary(skipped="geo: no UAT table (run `pipeline geo-table`): no TopoJSON built")
    try:
        unit = latest_unit(archive, "ancpi", "uat-polygons")
    except Exception:
        return TopoSummary(skipped="geo: no ANCPI snapshot in the archive (run `pipeline geo-fetch`): no TopoJSON built")
    county_names = {c.iso: c.name for c in read_counties(base)}
    by_county: dict[str, list[tuple[dict, object]]] = defaultdict(list)
    for code, geom in iter_polygons(unit):
        row = uat_rows.get(code)
        if row:
            by_county[row["county_iso"]].append(({"code": code, "name": row["name"]}, geom))
    out = Path(out_dir)
    counties = []
    files = 0
    for iso in sorted(by_county):
        items = sorted(by_county[iso], key=lambda t: int(t[0]["code"]))
        merged = union_all([g for _, g in items])
        if closing:
            merged = merged.buffer(closing).buffer(-closing)
        if simplify:
            merged = merged.simplify(simplify, preserve_topology=True)
        counties.append(({"code": f"RO-{iso}", "name": county_names.get(iso, iso)}, merged))
        _write(out / "uats" / f"RO-{iso}.topo.json", encode({"sectors" if iso == "B" else "uats": items}))
        files += 1
    _write(out / "counties.topo.json", encode({"counties": counties}))
    files += 1
    summary = TopoSummary(counties=len(counties), uats=sum(len(v) for v in by_county.values()), files=files)
    _write(out / "index.json", {"ancpi": str(unit.path.relative_to(archive.root)), "counties": summary.counties, "uats": summary.uats,
                               "closing": closing, "simplify": simplify})
    return summary
