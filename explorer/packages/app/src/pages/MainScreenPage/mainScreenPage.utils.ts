import { OFF_MAP_TILE_AREAS } from "@grivei/ui";
import type { CountyTopologyState } from "../../geo/index.ts";
import type { QueryState } from "./hooks/useHeldQuery.ts";
import { isInFlight, isStale } from "./hooks/useHeldQuery.ts";
import type { Copy } from "../../copy/types.ts";

/**
 * The name the county chip shows for the filter's `county`: the name the page shows for that area elsewhere. A county is named by
 * the outlines' `properties.name` ("Brașov"); an off-map area by its tile's label ("Unplaced authorities"). While the outlines
 * load (or failed to), a county falls back to its code: the chip must reflect the filter, so it is never held back.
 */
export function countyChipName(county: string, topology: CountyTopologyState, tiles: Copy["moneyLensMap"]["tiles"]): string {
  if (county === OFF_MAP_TILE_AREAS.national) return tiles.national;
  if (county === OFF_MAP_TILE_AREAS.unplaced) return tiles.unplaced;
  if (county === OFF_MAP_TILE_AREAS.unknownSupplierCounty) return tiles.unknownSupplierCounty;
  if (topology.status !== "ready") return county;
  const counties = topology.topology.objects["counties"];
  if (counties?.type !== "GeometryCollection") return county;
  const named = counties.geometries.map((geometry) => (geometry.properties ?? {}) as { code?: unknown; name?: unknown });
  const name = named.find((properties) => properties.code === county)?.name;
  return typeof name === "string" ? name : county;
}

/** Any request in flight: the main query, the zoomed county's and the Coverage lens's, each only while it is asked. */
export function anyInFlight(main: QueryState<unknown>, zoom: { asked: boolean; state: QueryState<unknown> }, coverage: { asked: boolean; state: QueryState<unknown> }): boolean {
  return isInFlight(main) || (zoom.asked && isInFlight(zoom.state)) || (coverage.asked && isInFlight(coverage.state));
}

/** Which panels show a held answer: the summary follows the main query; the map follows the query behind the lens on show (Coverage, the zoomed county, or the main one). */
export function busyPanels(main: QueryState<unknown>, shown: { coverage: boolean; zoomed: boolean }, zoom: QueryState<unknown>, coverage: QueryState<unknown>): { summary: boolean; map: boolean } {
  const map = shown.coverage ? isStale(coverage) : shown.zoomed ? isStale(zoom) : isStale(main);
  return { summary: isStale(main), map };
}
