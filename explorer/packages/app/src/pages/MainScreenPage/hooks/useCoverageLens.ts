import type { CoverageLensQuery, CoverageLensQueryVariables } from "@grivei/contract";
import { CoverageLens } from "../../../graphql/operations.ts";
import { useHeldQuery, type QueryState } from "./useHeldQuery.ts";

export type CoverageLensState = QueryState<CoverageLensQuery>;

/**
 * The Coverage lens's answer for the date chip's window (`null` = the lens is not shown, nothing is asked). One request per window, a superseded one
 * aborted. The last window's answer is held while the next loads, but only while the lens stays shown: switching it off and on starts from loading.
 */
export function useCoverageLens(variables: CoverageLensQueryVariables | null): CoverageLensState {
  return useHeldQuery(CoverageLens, variables);
}
