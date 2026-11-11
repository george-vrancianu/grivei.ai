// PROTOTYPE, throwaway. Planar county shapes (lon scaled by cos 46°) so d3 doesn't care about ring winding.
import * as d3 from "d3";
import { counties } from "./data";

const K = Math.cos((46 * Math.PI) / 180);
const scale = (c) => (typeof c[0] === "number" ? [c[0] * K, c[1]] : c.map(scale));
export const planar = {
  type: "FeatureCollection",
  features: counties.features.map((f) => ({ ...f, geometry: { ...f.geometry, coordinates: scale(f.geometry.coordinates) } })),
};

export function useGeo(w, h) {
  const proj = d3.geoIdentity().reflectY(true).fitSize([w, h], planar);
  const path = d3.geoPath(proj);
  const centroid = new Map(planar.features.map((f) => [f.properties.iso, path.centroid(f)]));
  return { path, centroid };
}

/** Snap county centroids to a tile grid (cols x rows), nearest free cell first. */
export function tileGrid(cols, rows) {
  const { centroid } = useGeo(cols, rows);
  const taken = new Set(), out = new Map();
  const items = [...centroid.entries()].sort((a, b) => a[1][1] - b[1][1] || a[1][0] - b[1][0]);
  for (const [iso, [x, y]] of items) {
    let best, bd = Infinity;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (taken.has(`${c},${r}`)) continue;
      const d = (c + 0.5 - x) ** 2 + (r + 0.5 - y) ** 2;
      if (d < bd) { bd = d; best = [c, r]; }
    }
    taken.add(best.join(",")); out.set(iso, best);
  }
  return out;
}
