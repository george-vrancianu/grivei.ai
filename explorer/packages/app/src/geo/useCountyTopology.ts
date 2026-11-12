import { useEffect, useState } from "react";
import { useLoadCountyTopology, type CountyTopology } from "./CountyTopologyContext.tsx";

export type CountyTopologyState = { status: "loading" } | { status: "error" } | { status: "ready"; topology: CountyTopology };

/** The county outlines, loaded once for the app; `error` when they cannot be fetched (the page then shows no map). */
export function useCountyTopology(): CountyTopologyState {
  const load = useLoadCountyTopology();
  const [state, setState] = useState<CountyTopologyState>({ status: "loading" });
  useEffect(() => {
    let current = true;
    load().then(
      (topology) => current && setState({ status: "ready", topology }),
      () => current && setState({ status: "error" }),
    );
    return () => {
      current = false;
    };
  }, [load]);
  return state;
}
