import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientProvider, useClient, useRequestsInFlight } from "./ClientContext.tsx";
import type { GraphqlClient } from "./client.ts";
import type { Operation } from "./operations.ts";

describe("ClientProvider", () => {
  it("hands out the same wrapped client across renders, and a new one for a new injected client", () => {
    const seen: GraphqlClient[] = [];
    const Probe = () => {
      seen.push(useClient());
      return null;
    };
    const a: GraphqlClient = { query: () => Promise.resolve(null as never) };
    const b: GraphqlClient = { query: () => Promise.resolve(null as never) };
    const { rerender } = render(<ClientProvider client={a}><Probe /></ClientProvider>);
    rerender(<ClientProvider client={a}><Probe /></ClientProvider>);
    expect(seen[1]).toBe(seen[0]);
    rerender(<ClientProvider client={b}><Probe /></ClientProvider>);
    expect(seen[2]).not.toBe(seen[0]);
  });

  it("reports a request in flight to useRequestsInFlight without re-rendering useClient readers", async () => {
    let release!: () => void;
    const client: GraphqlClient = { query: () => new Promise((resolve) => (release = () => resolve(1 as never))) };
    let clientRenders = 0;
    const states: boolean[] = [];
    let query!: () => Promise<unknown>;
    const Reader = () => {
      states.push(useRequestsInFlight());
      return null;
    };
    const Consumer = () => {
      const c = useClient();
      clientRenders++;
      query = () => c.query({ id: "x" } as unknown as Operation<unknown, unknown>, {});
      return null;
    };
    render(<ClientProvider client={client}><Reader /><Consumer /></ClientProvider>);
    const before = clientRenders;
    let done!: Promise<unknown>;
    act(() => void (done = query()));
    expect(states.at(-1)).toBe(true);
    await act(async () => {
      release();
      await done;
    });
    expect(states.at(-1)).toBe(false);
    expect(clientRenders).toBe(before);
  });
});
