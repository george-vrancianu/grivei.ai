import type { FullResultsAuthoritiesQuery, FullResultsRecordsQuery, FullResultsSuppliersQuery, RecordFilter, RecordOrder } from "@grivei/contract";
import type { FullResultsData, ResultTab } from "@grivei/ui";
import { FullResultsAuthorities, FullResultsRecords, FullResultsSuppliers, type Operation } from "../../../graphql/operations.ts";
import { useHeldQuery } from "../../../graphql/useHeldQuery.ts";

/** Rows per page of the full-results view: the same top 50 the main screen's tabs show. */
export const FULL_RESULTS_PAGE_SIZE = 50;

export interface FullResultsRequest {
  tab: ResultTab;
  filter: RecordFilter;
  /** 1-based. */
  page: number;
  /** Only the Records tab is ordered. */
  order?: RecordOrder | undefined;
}

/** `ready` with `stale: true` is the last answer, held while the next request (another page, order or filter) is in flight; `loading` only when there is nothing to show. */
export type FullResultsState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; results: FullResultsData; stale: boolean };

type Answer = FullResultsAuthoritiesQuery | FullResultsSuppliersQuery | FullResultsRecordsQuery;
type Variables = { filter: RecordFilter; limit: number; offset: number; order?: RecordOrder | undefined };

/** The tab's operation; the three take the same paging variables (only Records has `order`), so one hook runs whichever is open. */
const OPERATIONS = { authorities: FullResultsAuthorities, suppliers: FullResultsSuppliers, records: FullResultsRecords } as unknown as Record<ResultTab, Operation<Answer, Variables>>;

/** The tab's answer, as the view's data. */
function toResults(tab: ResultTab, answer: Answer): FullResultsData {
  const search = answer.seap.search;
  switch (tab) {
    case "authorities":
      return { tab, page: (search as FullResultsAuthoritiesQuery["seap"]["search"]).authorities };
    case "suppliers":
      return { tab, page: (search as FullResultsSuppliersQuery["seap"]["search"]).suppliers };
    case "records":
      return { tab, page: (search as FullResultsRecordsQuery["seap"]["search"]).records };
  }
}

/**
 * Runs the open tab's FullResults query (the page turned into `limit` and `offset`) and keeps the last answer on screen while the next loads (another page, order or filter).
 * The tab is the hold key: one tab's answer is never shown under another, which reads as loading.
 */
export function useFullResults({ tab, filter, page, order }: FullResultsRequest): FullResultsState {
  const variables: Variables = { filter, limit: FULL_RESULTS_PAGE_SIZE, offset: (page - 1) * FULL_RESULTS_PAGE_SIZE, ...(tab === "records" ? { order } : {}) };
  const query = useHeldQuery(OPERATIONS[tab], variables, tab);
  if (query.status !== "ready") return query;
  return { status: "ready", results: toResults(tab, query.data), stale: query.stale };
}
