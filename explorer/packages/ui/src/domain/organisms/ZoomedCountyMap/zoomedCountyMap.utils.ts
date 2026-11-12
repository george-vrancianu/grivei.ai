import type { UatMap } from "../../types.ts";

/** Each UAT's number of distinct authorities by SIRUTA, for the optional circles and the tooltip. */
export function authoritiesByUat(map: Pick<UatMap, "uats">): ReadonlyMap<string, number> {
  return new Map(map.uats.map((uat) => [uat.area, uat.entities]));
}

/** The circle's radius in SVG units: its area follows the number of authorities, so the biggest UAT gets `max` and one authority a visible dot. */
export function circleRadius(entities: number, most: number, max = 16, min = 3): number {
  if (entities <= 0 || most <= 0) return 0;
  return Math.max(min, max * Math.sqrt(entities / most));
}
