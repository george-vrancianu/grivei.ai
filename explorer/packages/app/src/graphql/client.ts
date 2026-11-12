import type { Operation } from "./operations.ts";

export interface GraphqlClient {
  query<Data, Variables>(op: Operation<Data, Variables>, variables: Variables, options?: { signal?: AbortSignal }): Promise<Data>;
}

export class GraphqlError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/**
 * A client that sends persisted-query ids, never query text: `POST /graphql {"id": ..., "variables": ...}`.
 * `fetch` is injectable so tests (and the workbench) can answer from the contract's fixtures.
 */
export function createClient({
  endpoint = "/graphql",
  fetch: send = (input, init) => globalThis.fetch(input, init),
}: { endpoint?: string; fetch?: typeof fetch } = {}): GraphqlClient {
  return {
    async query(op, variables, options) {
      const response = await send(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: op.id, variables }),
        signal: options?.signal ?? null,
      });
      const body = (await response.json().catch(() => ({}))) as { data?: unknown; errors?: { message: string; extensions?: { code?: string } }[] };
      const first = body.errors?.[0];
      if (first) throw new GraphqlError(first.message, first.extensions?.code);
      if (!response.ok || body.data === undefined) throw new GraphqlError(`HTTP ${response.status}`);
      return body.data as never;
    },
  };
}
