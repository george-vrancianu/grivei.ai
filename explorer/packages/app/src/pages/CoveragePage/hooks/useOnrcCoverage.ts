import { useHeldQuery, type QueryState } from "../../../graphql/useHeldQuery.ts";
import { OnrcCoverage } from "../../../graphql/operations.ts";
import type { OnrcCoverageQuery } from "@grivei/contract";

export type OnrcCoverageState = QueryState<OnrcCoverageQuery>;

const WHOLE_SET = {};

/**
 * ONRC's Coverage (one cell per snapshot, the data-through date): the whole of what is held, no window (ONRC has no date chip for it).
 * `asked` false = the lens is not shown and nothing is asked. A held query: the last answer stays while a request is repeated, and a failure carries `retry`.
 */
export function useOnrcCoverage(asked: boolean): OnrcCoverageState {
  return useHeldQuery(OnrcCoverage, asked ? WHOLE_SET : null);
}
