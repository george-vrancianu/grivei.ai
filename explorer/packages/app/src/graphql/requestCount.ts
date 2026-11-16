import type { GraphqlClient } from "./client.ts";

/** An in-flight request counter: `subscribe`/`getCount` fit `useSyncExternalStore`. */
export interface RequestCounter {
  subscribe(listener: () => void): () => void;
  getCount(): number;
}

/** Wraps a client so every `query` is counted from its call until it settles (resolved, rejected or aborted: `finally`). */
export function countRequests(client: GraphqlClient): { client: GraphqlClient; counter: RequestCounter } {
  let count = 0;
  const listeners = new Set<() => void>();
  const change = (by: number) => {
    count += by;
    for (const listener of listeners) listener();
  };
  const counted: GraphqlClient = {
    async query(op, variables, options) {
      change(1);
      try {
        return await client.query(op, variables, options);
      } finally {
        change(-1);
      }
    },
  };
  return {
    client: counted,
    counter: {
      subscribe(listener) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
      getCount: () => count,
    },
  };
}
