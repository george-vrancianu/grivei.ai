import type { CountySide } from "@grivei/ui";

/** The off-map areas that exist on one side only; every county code exists on both. */
const SIDE_OF_AREA: Record<string, CountySide> = { NATIONAL: "AUTHORITY", UNPLACED: "AUTHORITY", UNKNOWN_SUPPLIER_COUNTY: "SUPPLIER" };

/** A click on the area already chosen takes the choice back (the county leaves the filter); any other click chooses it. */
export function countyAfterClick(current: string | undefined, clicked: string): string | undefined {
  return clicked === current ? undefined : clicked;
}

/** Changing the side keeps the county, except an off-map area the other side does not have (it would match nothing). */
export function countyAfterSideChange(current: string | undefined, side: CountySide): string | undefined {
  if (current === undefined) return undefined;
  const only = SIDE_OF_AREA[current];
  return only === undefined || only === side ? current : undefined;
}
