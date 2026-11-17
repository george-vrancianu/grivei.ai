import { useState } from "react";

/** What the spinner reads of a page's query state: nothing shown yet, failed, or an answer (`stale` while the next request is in flight). */
type SpinnerQuery = { status: "loading" | "error" } | { status: "ready"; stale: boolean };

/**
 * The search spinner is for a typed query: true while a request is in flight for a query other than the one last answered (a filter click, a page or an
 * order change leaves the query alone). A settled answer, or an error, ends the typed query's spinner.
 */
export function useTypedQuerySpinner(q: string | null | undefined, state: SpinnerQuery): boolean {
  const [answeredQ, setAnsweredQ] = useState(q);
  if ((state.status === "error" || (state.status === "ready" && !state.stale)) && answeredQ !== q) setAnsweredQ(q);
  const inFlight = state.status === "loading" || (state.status === "ready" && state.stale);
  return inFlight && q !== answeredQ;
}
