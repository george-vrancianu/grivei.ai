import { useEffect, useState } from "react";
import type { CoverageLensQuery, CoverageLensQueryVariables } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { CoverageLens } from "../../../graphql/operations.ts";

export type CoverageLensState = { status: "loading" } | { status: "error" } | { status: "ready"; data: CoverageLensQuery };
type Settled = Exclude<CoverageLensState, { status: "loading" }>;

/**
 * The Coverage lens's answer for the date chip's window (`null` = the lens is not shown, nothing is asked). Same pattern as
 * `useZoomedCounty`: one request per window, a superseded one aborted, other variables read as loading again.
 */
export function useCoverageLens(variables: CoverageLensQueryVariables | null): CoverageLensState {
  const client = useClient();
  const key = JSON.stringify(variables);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    const parsed = JSON.parse(key) as CoverageLensQueryVariables | null;
    if (parsed === null) return;
    const controller = new AbortController();
    client
      .query(CoverageLens, parsed, { signal: controller.signal })
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
