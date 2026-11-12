import { OFF_MAP_TILE_AREAS } from "@grivei/ui";
import type { RecordFilter, ZoomedCountyQueryVariables } from "@grivei/contract";

/** The off-map areas a `county` filter can hold besides a real county: none of them has UATs to zoom into. */
const OFF_MAP = new Set<string>(Object.values(OFF_MAP_TILE_AREAS));

/** Bucharest is one county of sectors: the heading says so. */
export const BUCHAREST = "RO-B";

/**
 * The county the main screen zooms into, or null. A county in the filter zooms when it is an ISO county (`RO-BV`, `RO-B`)
 * and the side is the authority's: the UAT map is authority-side only (a supplier's UAT is never stored), so on the
 * supplier side the county stays a plain filter and the Money lens keeps its county map.
 */
export function zoomedCountyOf(filter: RecordFilter): string | null {
  const county = filter.county;
  if (!county || OFF_MAP.has(county) || filter.countySide === "SUPPLIER") return null;
  return county;
}

/**
 * The `ZoomedCounty` variables for a page filter: the filter without `uat` (the choropleth stays whole while one UAT is
 * chosen: its click only narrows the results, the Total and the tabs) plus the county.
 */
export function zoomVariables(filter: RecordFilter, county: string): ZoomedCountyQueryVariables {
  const rest = { ...filter, county };
  delete rest.uat;
  return { filter: rest, county };
}

/** A click on the chosen UAT takes the choice back (the UAT leaves the filter); any other click chooses it. */
export function uatAfterClick(current: string | undefined, clicked: string): string | undefined {
  return clicked === current ? undefined : clicked;
}
