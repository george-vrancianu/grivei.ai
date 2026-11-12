import { useEffect, useState } from "react";
import type { RecordFilter, RecordOrder } from "@grivei/contract";
import type { FullResultsData, ResultTab } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import type { GraphqlClient } from "../../../graphql/client.ts";
import { FullResultsAuthorities, FullResultsRecords, FullResultsSuppliers } from "../../../graphql/operations.ts";

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

export type FullResultsState = { status: "loading" } | { status: "error" } | { status: "ready"; results: FullResultsData };
type Settled = Exclude<FullResultsState, { status: "loading" }>;

/** The tab's operation, with the page turned into `limit` and `offset`. */
function fetchPage(client: GraphqlClient, r: FullResultsRequest, signal: AbortSignal): Promise<FullResultsData> {
  const paging = { filter: r.filter, limit: FULL_RESULTS_PAGE_SIZE, offset: (r.page - 1) * FULL_RESULTS_PAGE_SIZE };
  switch (r.tab) {
    case "authorities":
      return client.query(FullResultsAuthorities, paging, { signal }).then((d) => ({ tab: "authorities" as const, page: d.seap.search.authorities }));
    case "suppliers":
      return client.query(FullResultsSuppliers, paging, { signal }).then((d) => ({ tab: "suppliers" as const, page: d.seap.search.suppliers }));
    case "records":
      return client.query(FullResultsRecords, { ...paging, order: r.order }, { signal }).then((d) => ({ tab: "records" as const, page: d.seap.search.records }));
  }
}

/** Runs the open tab's FullResults query; a different request reads as loading again and the superseded one is cancelled. */
export function useFullResults(request: FullResultsRequest): FullResultsState {
  const client = useClient();
  const key = JSON.stringify(request);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(client, JSON.parse(key) as FullResultsRequest, controller.signal)
      .then((results) => setSettled({ key, state: { status: "ready", results } }))
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, key]);

  return settled?.key === key ? settled.state : { status: "loading" };
}
