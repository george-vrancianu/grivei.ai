import { useEffect, useState } from "react";
import type { MainScreenQuery, MainScreenQueryVariables } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { MainScreen } from "../../../graphql/operations.ts";

export type MainScreenState = { status: "loading" } | { status: "error" } | { status: "ready"; data: MainScreenQuery };
type Settled = Exclude<MainScreenState, { status: "loading" }>;

/** The tracer asks for the empty filter only; the URL codec (#42) will feed the real one. */
const EMPTY: MainScreenQueryVariables = { filter: {} };

export function useMainScreen(variables: MainScreenQueryVariables = EMPTY): MainScreenState {
  const client = useClient();
  const key = JSON.stringify(variables);
  // The answer remembers which variables it is for: a different key reads as loading again, with no state reset in the effect.
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    client
      .query(MainScreen, JSON.parse(key) as MainScreenQueryVariables, { signal: controller.signal })
      .then((data) => setSettled({ key, state: { status: "ready", data } }))
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort(); // a superseded request is cancelled
  }, [client, key]);

  return settled?.key === key ? settled.state : { status: "loading" };
}
