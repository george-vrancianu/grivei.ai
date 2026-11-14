import { useEffect, useState } from "react";
import type { OnrcCoverageQuery } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { OnrcCoverage } from "../../../graphql/operations.ts";

export type OnrcCoverageState = { status: "loading" } | { status: "error" } | { status: "ready"; data: OnrcCoverageQuery };
type Settled = Exclude<OnrcCoverageState, { status: "loading" }>;

/**
 * ONRC's Coverage (one cell per snapshot, the data-through date): the whole of what is held, no window (ONRC has no date chip for it).
 * `asked` false = the lens is not shown and nothing is asked. Same pattern as `useCoveragePage`: a superseded request is cancelled.
 */
export function useOnrcCoverage(asked: boolean): OnrcCoverageState {
  const client = useClient();
  const [settled, setSettled] = useState<Settled | null>(null);
  useEffect(() => {
    if (!asked) return;
    const controller = new AbortController();
    client
      .query(OnrcCoverage, {}, { signal: controller.signal })
      .then((data) => !controller.signal.aborted && setSettled({ status: "ready", data }))
      .catch(() => !controller.signal.aborted && setSettled({ status: "error" }));
    return () => controller.abort();
  }, [client, asked]);
  return asked && settled ? settled : { status: "loading" };
}
