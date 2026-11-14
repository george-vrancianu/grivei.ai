// The picker's count requests: each is superseded by the next query, and an answer that arrives late never lands (#178).
import { fixtures } from "@grivei/contract/fixtures";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { GraphqlClient } from "../graphql/client.ts";
import { ClientProvider } from "../graphql/ClientContext.tsx";
import { COUNT_ONLY_LIMIT, useSourceCounts } from "./useSourceCounts.ts";

const typical = fixtures.OnrcSearch.find((f) => f.name === "typical-name-and-alias-hits")!.data;
const answerOf = (count: number) => ({ onrc: { search: { ...typical.onrc.search, count } } });

/** A client whose requests wait for the test: it records each request's variables and signal, and answers when told to. */
function heldClient() {
  const requests: { variables: unknown; signal?: AbortSignal; answer: (data: unknown) => void }[] = [];
  const client: GraphqlClient = {
    query: (_op, variables, options) => new Promise((resolve) => requests.push({ variables, signal: options?.signal, answer: resolve as (data: unknown) => void })),
  } as GraphqlClient;
  return { client, requests };
}

describe("the Source picker's count of the other Source", () => {
  it("asks for the count alone, aborts a request the next query supersedes, and never lets its late answer land", async () => {
    const { client, requests } = heldClient();
    const wrapper = ({ children }: { children: ReactNode }) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result, rerender } = renderHook(({ q }) => useSourceCounts(q, "SEAP", { n: 8, estimated: false }), { wrapper, initialProps: { q: "alfa" } });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.variables).toEqual({ filter: { q: "alfa" }, limit: COUNT_ONLY_LIMIT, offset: 0 });

    rerender({ q: "alfa beta" });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]?.signal?.aborted).toBe(true);
    expect(requests[1]?.signal?.aborted).toBe(false);

    // the superseded request answers late: its number never shows; the current one's does
    await act(async () => requests[0]?.answer(answerOf(111)));
    expect(result.current.ONRC).toBeNull();
    await act(async () => requests[1]?.answer(answerOf(2)));
    expect(result.current.ONRC).toEqual({ n: 2, estimated: false });
    expect(result.current.SEAP).toEqual({ n: 8, estimated: false });
  });
});
