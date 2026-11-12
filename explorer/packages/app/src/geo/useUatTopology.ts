import { useEffect, useState } from "react";
import { useLoadUatTopology, type UatTopology } from "./UatTopologyContext.tsx";

export type UatTopologyState = { status: "loading" } | { status: "error" } | { status: "ready"; topology: UatTopology };

/**
 * The outlines of one county's UATs (`null` = no county zoomed into, nothing is fetched). The answer remembers its county,
 * so a different county reads as loading again until its own outlines arrive; a missing file reads as `error`.
 */
export function useUatTopology(county: string | null): UatTopologyState {
  const load = useLoadUatTopology();
  const [settled, setSettled] = useState<{ county: string; state: Exclude<UatTopologyState, { status: "loading" }> } | null>(null);
  useEffect(() => {
    if (county === null) return;
    let current = true;
    load(county).then(
      (topology) => current && setSettled({ county, state: { status: "ready", topology } }),
      () => current && setSettled({ county, state: { status: "error" } }),
    );
    return () => {
      current = false;
    };
  }, [load, county]);
  return settled?.county === county ? settled.state : { status: "loading" };
}
