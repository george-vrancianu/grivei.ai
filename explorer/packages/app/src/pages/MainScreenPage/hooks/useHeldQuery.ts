import { useCallback, useEffect, useState } from "react";
import { useClient } from "../../../graphql/ClientContext.tsx";
import type { Operation } from "../../../graphql/operations.ts";

/**
 * What a main-screen query tells the page. `loading` only when there is no answer to show; while the next request is in flight the previous answer
 * stays as `ready` with `stale: true`. `error` carries `retry`, which asks the current request again.
 */
export type QueryState<Data> = { status: "loading" } | { status: "ready"; data: Data; stale: boolean } | { status: "error"; retry: () => void };

type Settled<Data> = { key: string; state: { status: "ready"; data: Data } | { status: "error" } };

/**
 * One query that keeps its last answer while the next loads. `variables === null` asks nothing and is always `loading`, and forgets the held answer
 * (a lens switched off and on starts again). `holdKey` names what a held answer is for: it is shown beside a new request only when the key is the same
 * (the zoomed county: the same county across filters, never another county's answer). A superseded request is aborted and an aborted answer never lands.
 */
export function useHeldQuery<Data, Variables>(op: Operation<Data, Variables>, variables: Variables | null, holdKey = ""): QueryState<Data> {
  const client = useClient();
  const key = JSON.stringify(variables);
  const [settled, setSettled] = useState<Settled<Data> | null>(null);
  const [held, setHeld] = useState<{ holdKey: string; data: Data } | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (variables === null && (held !== null || settled !== null)) {
    setHeld(null);
    setSettled(null);
  }

  useEffect(() => {
    if (key === "null") return;
    const controller = new AbortController();
    client
      .query(op, JSON.parse(key) as Variables, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return; // a stale answer never lands
        setSettled({ key, state: { status: "ready", data } });
        setHeld({ holdKey, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort(); // a superseded request is cancelled
  }, [client, op, key, holdKey, attempt]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((n) => n + 1);
  }, []);

  if (variables === null) return { status: "loading" };
  if (settled?.key === key) return settled.state.status === "ready" ? { status: "ready", data: settled.state.data, stale: false } : { status: "error", retry };
  if (held?.holdKey === holdKey) return { status: "ready", data: held.data, stale: true };
  return { status: "loading" };
}
