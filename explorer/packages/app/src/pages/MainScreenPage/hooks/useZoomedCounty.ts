import type { ZoomedCountyQuery, ZoomedCountyQueryVariables } from "@grivei/contract";
import { ZoomedCounty } from "../../../graphql/operations.ts";
import { useHeldQuery, type QueryState } from "./useHeldQuery.ts";

export type ZoomedCountyState = QueryState<ZoomedCountyQuery>;

/**
 * The UAT map of the zoomed county for the page's filter (`null` = not zoomed, nothing is asked). Runs beside `useMainScreen`:
 * one request per filter for each operation, a superseded one aborted, so the choropleth, the Total and the tabs describe the same filter.
 * The last answer is held only for the same county (across filter changes): the map is titled with the county's name, so another county's answer would be wrong.
 */
export function useZoomedCounty(variables: ZoomedCountyQueryVariables | null): ZoomedCountyState {
  return useHeldQuery(ZoomedCounty, variables, variables?.county ?? "");
}
