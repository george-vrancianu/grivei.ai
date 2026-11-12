import { useEffect, useState } from "react";
import type { CoveragePageData } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { CoveragePage } from "../../../graphql/operations.ts";
import type { CoveragePageVariables } from "../coveragePage.types.ts";

export type CoveragePageState = { status: "loading" } | { status: "error" } | { status: "ready"; data: CoveragePageData };
type Settled = Exclude<CoveragePageState, { status: "loading" }>;

/**
 * Runs the `CoveragePage` query; other variables read as loading again and the superseded request is cancelled.
 * The Coverage lens's compact grid asks the same operation through this hook (#90), with `{}` (the whole grid) and highlights the
 * date chip's window with `CoverageGridCompact`'s `dateWindow` (see `highlightWindow`). A windowed `CoveragePage` would hand back
 * only the quarters inside the window, so every column would read as highlighted. `null` = nothing is asked (the lens is not shown).
 */
export function useCoveragePage(variables: CoveragePageVariables | null): CoveragePageState {
  const client = useClient();
  const key = JSON.stringify(variables);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    if (key === "null") return;
    const controller = new AbortController();
    client
      .query(CoveragePage, JSON.parse(key) as CoveragePageVariables, { signal: controller.signal })
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
