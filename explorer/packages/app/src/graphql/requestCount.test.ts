import { describe, expect, it } from "vitest";
import type { GraphqlClient } from "./client.ts";
import type { Operation } from "./operations.ts";
import { countRequests } from "./requestCount.ts";

const op = { id: "x" } as unknown as Operation<unknown, unknown>;

function gated() {
  const pending: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];
  const client: GraphqlClient = {
    query: () => new Promise((resolve, reject) => void pending.push({ resolve: resolve as (v: unknown) => void, reject })) as never,
  };
  return { client, pending };
}

describe("countRequests", () => {
  it("counts a query from its start to its answer and tells listeners", async () => {
    const { client, pending } = gated();
    const { client: counted, counter } = countRequests(client);
    let calls = 0;
    counter.subscribe(() => calls++);
    const a = counted.query(op, {});
    const b = counted.query(op, {});
    expect(counter.getCount()).toBe(2);
    pending[0]!.resolve(1);
    await a;
    expect(counter.getCount()).toBe(1);
    pending[1]!.resolve(2);
    await expect(b).resolves.toBe(2);
    expect(counter.getCount()).toBe(0);
    expect(calls).toBe(4);
  });

  it("still decrements when the query rejects or is aborted", async () => {
    const { client, pending } = gated();
    const { client: counted, counter } = countRequests(client);
    const a = counted.query(op, {});
    pending[0]!.reject(new DOMException("aborted", "AbortError"));
    await expect(a).rejects.toThrow("aborted");
    expect(counter.getCount()).toBe(0);
  });

  it("stops telling a listener that unsubscribed", async () => {
    const { client, pending } = gated();
    const { client: counted, counter } = countRequests(client);
    let calls = 0;
    const off = counter.subscribe(() => calls++);
    off();
    const a = counted.query(op, {});
    pending[0]!.resolve(1);
    await a;
    expect(calls).toBe(0);
  });
});
