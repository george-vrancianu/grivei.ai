import type { CountyTopology } from "../geo/index.ts";

/** A box as a clockwise ring (south-west, north-west, north-east, south-east), the winding d3-geo needs for an exterior. */
const box = (west: number, south: number, east: number, north: number): [number, number][] => [
  [west, south], [west, north], [east, north], [east, south], [west, south],
];

/**
 * Three invented county outlines for tests and stories, keyed like the real `counties.topo.json` (ISO 3166-2:RO in
 * `properties.code`): Brașov, Cluj and București, the counties the recorded fixtures (archive-moneymap) put money in.
 * Not real geography.
 */
export const testCountyTopology: CountyTopology = {
  type: "Topology",
  objects: {
    counties: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", arcs: [[0]], properties: { code: "RO-CJ", name: "Cluj" } },
        { type: "Polygon", arcs: [[1]], properties: { code: "RO-BV", name: "Brașov" } },
        { type: "Polygon", arcs: [[2]], properties: { code: "RO-B", name: "București" } },
      ],
    },
  },
  arcs: [box(22.8, 46.4, 24.2, 47.2), box(25.0, 45.4, 26.2, 46.2), box(25.9, 44.2, 26.4, 44.6)],
};
export const loadTestCountyTopology = async (): Promise<CountyTopology> => testCountyTopology;
