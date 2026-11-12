import { useEffect, useState } from "react";
import type { ZoomedCountyQuery, ZoomedCountyQueryVariables } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { ZoomedCounty } from "../../../graphql/operations.ts";

export type ZoomedCountyState = { status: "loading" } | { status: "error" } | { status: "ready"; data: ZoomedCountyQuery };
type Settled = Exclude<ZoomedCountyState, { status: "loading" }>;

/**
 * The UAT map of the zoomed county for the page's filter (`null` = not zoomed, nothing is asked). Runs beside `useMainScreen`:
 * one request per filter for each operation, a superseded one aborted, so the choropleth, the Total and the tabs describe the same filter.
 */
export function useZoomedCounty(variables: ZoomedCountyQueryVariables | null): ZoomedCountyState {
  const client = useClient();
  const key = JSON.stringify(variables);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    const parsed = JSON.parse(key) as ZoomedCountyQueryVariables | null;
    if (parsed === null) return;
    const controller = new AbortController();
    client
      .query(ZoomedCounty, parsed, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "ready", data } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, key]);

  return settled?.key === key ? settled.state : { status: "loading" };
}
