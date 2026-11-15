import type { MainScreenQuery, MainScreenQueryVariables } from "@grivei/contract";
import { MainScreen } from "../../../graphql/operations.ts";
import { useHeldQuery, type QueryState } from "./useHeldQuery.ts";

export type MainScreenState = QueryState<MainScreenQuery>;

/** The main screen's one query, for the filter the URL names. The last answer stays (stale) across filter and county changes while the next loads. */
export function useMainScreen(variables: MainScreenQueryVariables): MainScreenState {
  return useHeldQuery(MainScreen, variables);
}
