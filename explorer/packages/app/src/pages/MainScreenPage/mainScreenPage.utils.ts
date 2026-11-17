import type { QueryState } from "../../graphql/useHeldQuery.ts";
import { isInFlight, isStale } from "../../graphql/useHeldQuery.ts";

/** Any request in flight: the main query, the zoomed county's and the Coverage lens's, each only while it is asked. */
export function anyInFlight(main: QueryState<unknown>, zoom: { asked: boolean; state: QueryState<unknown> }, coverage: { asked: boolean; state: QueryState<unknown> }): boolean {
  return isInFlight(main) || (zoom.asked && isInFlight(zoom.state)) || (coverage.asked && isInFlight(coverage.state));
}

/** Which panels show a held answer: the summary follows the main query; the map follows the query behind the lens on show (Coverage, the zoomed county, or the main one). */
export function busyPanels(main: QueryState<unknown>, shown: { coverage: boolean; zoomed: boolean }, zoom: QueryState<unknown>, coverage: QueryState<unknown>): { summary: boolean; map: boolean } {
  const map = shown.coverage ? isStale(coverage) : shown.zoomed ? isStale(zoom) : isStale(main);
  return { summary: isStale(main), map };
}
