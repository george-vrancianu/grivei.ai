import type { UatTopologyState } from "./useUatTopology.ts";

/**
 * The name the UAT chip shows for the filter's `uat` (a SIRUTA): the county outlines' `properties.name` for that code (a UAT, or a sector for Bucharest).
 * `undefined` while the outlines load, failed, or do not know the code: the chip then shows the SIRUTA itself, so it is never held back.
 */
export function uatChipName(uat: string, topology: UatTopologyState): string | undefined {
  if (topology.status !== "ready") return undefined;
  for (const object of Object.values(topology.topology.objects)) {
    if (object.type !== "GeometryCollection") continue;
    for (const geometry of object.geometries) {
      const properties = (geometry.properties ?? {}) as { code?: unknown; name?: unknown };
      if (properties.code === uat && typeof properties.name === "string") return properties.name;
    }
  }
  return undefined;
}
