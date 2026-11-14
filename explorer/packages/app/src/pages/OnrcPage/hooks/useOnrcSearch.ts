import { useEffect, useState } from "react";
import type { OnrcFilter, OnrcSearchQuery } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { OnrcSearch } from "../../../graphql/operations.ts";
import { ONRC_PAGE_SIZE } from "../../../sources/useSourceCounts.ts";

export type OnrcSearchState = { status: "loading" } | { status: "error" } | { status: "ready"; data: OnrcSearchQuery };
type Settled = Exclude<OnrcSearchState, { status: "loading" }>;

/** ONRC's one search query for the filter the URL names: the count, a page of the Organisations tab and the count lens, all for the same matching set. */
export function useOnrcSearch(filter: OnrcFilter, page: number): OnrcSearchState {
  const client = useClient();
  const key = JSON.stringify({ filter, page });
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const variables = { filter: (JSON.parse(key) as { filter: OnrcFilter }).filter, limit: ONRC_PAGE_SIZE, offset: (page - 1) * ONRC_PAGE_SIZE };
    client
      .query(OnrcSearch, variables, { signal: controller.signal })
      .then((data) => !controller.signal.aborted && setSettled({ key, state: { status: "ready", data } })) // a stale answer never lands
      .catch(() => !controller.signal.aborted && setSettled({ key, state: { status: "error" } }));
    return () => controller.abort();
  }, [client, key, page]);
  return settled?.key === key ? settled.state : { status: "loading" };
}
