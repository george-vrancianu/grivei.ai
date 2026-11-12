import type { EntityRow } from "../../types.ts";

/** The county's name; "national" for a national body; otherwise the no-county wording (no placement, or no county on it). */
export function placeLabel(placement: EntityRow["placement"], copy: { national: string; noCounty: string }): string {
  if (placement?.county) return placement.county.name;
  return placement?.national ? copy.national : copy.noCounty;
}
