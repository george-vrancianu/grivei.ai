import { useCallback, useEffect, useState } from "react";
import { useLoadCountyTopology, type CountyTopology } from "./CountyTopologyContext.tsx";

export type CountyTopologyState = { status: "loading" } | { status: "error"; retry?: () => void } | { status: "ready"; topology: CountyTopology };

/** The county outlines, loaded once for the app; `error` when they cannot be fetched (the page then shows no map); `retry` asks again (the failed load is forgotten, so it fetches once more). */
export function useCountyTopology(): CountyTopologyState {
  const load = useLoadCountyTopology();
  const [state, setState] = useState<CountyTopologyState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);
  useEffect(() => {
    let current = true;
    load().then(
      (topology) => current && setState({ status: "ready", topology }),
      () => current && setState({ status: "error", retry }),
    );
    return () => {
      current = false;
    };
  }, [load, retry, attempt]);
  return state;
}
