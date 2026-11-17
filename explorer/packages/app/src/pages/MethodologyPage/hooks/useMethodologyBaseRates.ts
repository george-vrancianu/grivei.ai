import type { MethodologyBaseRates } from "@grivei/ui";
import { MethodologyBaseRates as MethodologyBaseRatesOperation } from "../../../graphql/operations.ts";
import { useHeldQuery } from "../../../graphql/useHeldQuery.ts";

const NO_VARIABLES = {};

/**
 * Runs the `MethodologyBaseRates` query: each Signal rule's window and national base rate. A failure is a state with its retry, never a thrown error: the prose does not depend on it.
 * The last answer is held while a retry is in flight (`stale`). Nothing else asks again: the page has no control that refetches.
 */
export function useMethodologyBaseRates(): MethodologyBaseRates {
  const query = useHeldQuery(MethodologyBaseRatesOperation, NO_VARIABLES);
  if (query.status === "loading") return { status: "loading" };
  if (query.status === "error") return { status: "error", retry: query.retry };
  return { status: "ready", rules: query.data.signalRules, stale: query.stale };
}
