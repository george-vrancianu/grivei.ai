import type { LoadUatTopology, UatTopology } from "../geo/index.ts";

/** A box as a clockwise ring (south-west, north-west, north-east, south-east), the winding d3-geo needs for an exterior. */
const box = (west: number, south: number, east: number, north: number): [number, number][] => [
  [west, south], [west, north], [east, north], [east, south], [west, south],
];

/** A row of side-by-side boxes, one per UAT, as the `object` of a topology (properties `{ code, name }`, code = SIRUTA). */
function row(object: "uats" | "sectors", uats: readonly (readonly [code: string, name: string])[]): UatTopology {
  return {
    type: "Topology",
    objects: {
      [object]: {
        type: "GeometryCollection",
        geometries: uats.map(([code, name], i) => ({ type: "Polygon" as const, arcs: [[i]], properties: { code, name } })),
      },
    },
    arcs: uats.map((_, i) => box(25 + i * 0.3, 45.4, 25.25 + i * 0.3, 45.9)),
  };
}

/**
 * Invented UAT outlines for tests and stories, keyed like the real `uats/RO-<ISO>.topo.json` files: SIRUTA in
 * `properties.code`, the codes of the recorded fixtures (archive-moneymap). Not real geography. Brasov has one UAT more
 * than the recorded money does (880020, always grey); Cluj has Cluj-Napoca (990001), where nothing was bought.
 */
export const testUatTopologies: Record<string, UatTopology> = {
  "RO-BV": row("uats", [["880001", "Brașov"], ["880010", "Sânpetru"], ["880020", "Bran"], ["880030", "Râșnov"], ["880050", "Ucea"], ["880060", "Șinca Nouă"]]),
  "RO-CJ": row("uats", [["990001", "Cluj-Napoca"], ["990010", "I. L. Caragiale"], ["990020", "Apahida"], ["990030", "Huedin"]]),
  "RO-B": row("sectors", [["179141", "Sector 1"], ["179150", "Sector 2"], ["179169", "Sector 3"], ["179178", "Sector 4"], ["179187", "Sector 5"], ["179196", "Sector 6"]]),
};

/** What the app loads in tests and stories: the county's invented outlines, or a "not found" for a county without a file. */
export const loadTestUatTopology: LoadUatTopology = async (county) => {
  const topology = testUatTopologies[county];
  if (!topology) throw new Error(`HTTP 404 for /geo/uats/${county}.topo.json`);
  return topology;
};
