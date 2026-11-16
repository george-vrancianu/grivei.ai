// The three main-screen hooks keep the last answer while the next loads: `loading` only with nothing to show, `ready` + `stale` meanwhile, `error` with a `retry`.
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ClientProvider } from "../../../graphql/ClientContext.tsx";
import type { GraphqlClient } from "../../../graphql/client.ts";
import { useCoverageLens } from "./useCoverageLens.ts";
import { useMainScreen } from "./useMainScreen.ts";
import { useZoomedCounty } from "./useZoomedCounty.ts";

interface Call {
  variables: unknown;
  signal: AbortSignal | undefined;
  answer: (data: unknown) => void;
  fail: () => void;
}

/** A client that answers nothing until the test does, and records each request with its abort signal. */
function manual() {
  const calls: Call[] = [];
  const client: GraphqlClient = {
    query: (_op, variables, options) =>
      new Promise((resolve, reject) => {
        calls.push({ variables, signal: options?.signal, answer: resolve as (data: unknown) => void, fail: () => reject(new Error("down")) });
      }),
  };
  const wrapper = ({ children }: { children: ReactNode }) => <ClientProvider client={client}>{children}</ClientProvider>;
  return { calls, wrapper };
}
const answer = async (call: Call | undefined, data: unknown) => {
  await act(async () => call?.answer(data));
};

describe("useMainScreen", () => {
  it("is loading with no answer, ready on one, then ready and stale while the next filter loads, and ready again on its answer", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ q }) => useMainScreen({ filter: { q } }), { wrapper, initialProps: { q: "a" } });
    expect(result.current).toEqual({ status: "loading" });
    await answer(calls[0], "A");
    expect(result.current).toEqual({ status: "ready", data: "A", stale: false });

    rerender({ q: "b" });
    expect(result.current).toEqual({ status: "ready", data: "A", stale: true });
    await answer(calls[1], "B");
    expect(result.current).toEqual({ status: "ready", data: "B", stale: false });
  });

  it("aborts a superseded request and never lets its answer land", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ q }) => useMainScreen({ filter: { q } }), { wrapper, initialProps: { q: "a" } });
    await answer(calls[0], "A");
    rerender({ q: "b" });
    rerender({ q: "c" });
    expect(calls[1]?.signal?.aborted).toBe(true);
    await answer(calls[2], "C");
    await answer(calls[1], "B"); // late, ignoring the abort
    expect(result.current).toEqual({ status: "ready", data: "C", stale: false });
  });

  it("turns a failure into an error that carries retry, which asks the same request again", async () => {
    const { calls, wrapper } = manual();
    const { result } = renderHook(() => useMainScreen({ filter: {} }), { wrapper });
    await act(async () => calls[0]?.fail());
    expect(result.current.status).toBe("error");
    act(() => {
      if (result.current.status === "error") result.current.retry();
    });
    expect(result.current).toEqual({ status: "loading" });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.variables).toEqual(calls[0]?.variables);
    await answer(calls[1], "A");
    expect(result.current).toEqual({ status: "ready", data: "A", stale: false });
  });

  it("keeps the held answer behind a failed refetch, so retry shows it again, stale", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ q }) => useMainScreen({ filter: { q } }), { wrapper, initialProps: { q: "a" } });
    await answer(calls[0], "A");
    rerender({ q: "b" });
    await act(async () => calls[1]?.fail());
    expect(result.current.status).toBe("error");
    act(() => {
      if (result.current.status === "error") result.current.retry();
    });
    expect(result.current).toEqual({ status: "ready", data: "A", stale: true });
  });
});

describe("useZoomedCounty", () => {
  const vars = (county: string, q?: string) => ({ county, filter: { county, ...(q ? { q } : {}) } });

  it("holds the answer across filter changes for the same county", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ q }) => useZoomedCounty(vars("RO-BV", q)), { wrapper, initialProps: { q: undefined as string | undefined } });
    await answer(calls[0], "BV");
    rerender({ q: "x" });
    expect(result.current).toEqual({ status: "ready", data: "BV", stale: true });
  });

  it("shows loading, not the old county's answer, when the county changes (it would title B's map with A's name), and zooming in from national", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ county }) => useZoomedCounty(county === null ? null : vars(county)), { wrapper, initialProps: { county: "RO-BV" as string | null } });
    await answer(calls[0], "BV");
    rerender({ county: "RO-CJ" });
    expect(result.current).toEqual({ status: "loading" });
    await answer(calls[1], "CJ");
    expect(result.current).toEqual({ status: "ready", data: "CJ", stale: false });

    rerender({ county: null }); // zoomed out: nothing is asked and nothing is held
    expect(result.current).toEqual({ status: "loading" });
    rerender({ county: "RO-CJ" });
    expect(result.current).toEqual({ status: "loading" });
    expect(calls).toHaveLength(3);
  });
});

describe("useCoverageLens", () => {
  it("holds the last window's answer while the lens stays on, and starts from loading after it was off", async () => {
    const { calls, wrapper } = manual();
    const { result, rerender } = renderHook(({ window }) => useCoverageLens(window), { wrapper, initialProps: { window: {} as Record<string, string> | null } });
    await answer(calls[0], "ALL");
    rerender({ window: { window: "2023" } as never });
    expect(result.current).toEqual({ status: "ready", data: "ALL", stale: true });
    await answer(calls[1], "2023");
    expect(result.current).toEqual({ status: "ready", data: "2023", stale: false });

    rerender({ window: null });
    expect(result.current).toEqual({ status: "loading" });
    rerender({ window: {} });
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(calls).toHaveLength(3));
  });
});
