// Unit tests of the result cache's memory bound, eviction (#70) and shared in-flight misses (#144); no database: a fake pool answers the generation read.
import type pg from "pg";
import { describe, expect, it } from "vitest";
import { approxBytes, cachedStore } from "../src/cache.ts";
import type { Store } from "../src/store.ts";

function fakePool(state: { generation: string | Error }): pg.Pool {
  return {
    query: async () => {
      if (state.generation instanceof Error) throw state.generation;
      return { rows: [{ generation: state.generation }] };
    },
  } as unknown as pg.Pool;
}

const totalOf = (q: string) => ({ awarded: "x".repeat(100), records: q.length, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" });

function fakeInner(calls: string[]): Store {
  return {
    searchTotal: async (f: { q?: string | null }) => (calls.push(f.q ?? ""), totalOf(f.q ?? "")),
  } as unknown as Store;
}

describe("result cache bound", () => {
  it("evicts the least recently used entry once the byte budget is exceeded", async () => {
    const calls: string[] = [];
    const cost = approxBytes(totalOf("a"));
    const cache = cachedStore(fakeInner(calls), fakePool({ generation: "g1" }), { autoWarm: false, maxBytes: cost * 2 + 1 });
    await cache.searchTotal({ q: "aa" }); // a
    await cache.searchTotal({ q: "bb" }); // b
    await cache.searchTotal({ q: "aa" }); // hit: a is now the most recent
    await cache.searchTotal({ q: "cc" }); // over budget: b (least recently used) goes
    expect(cache.stats()).toMatchObject({ entries: 2, hits: 1, misses: 3 });
    expect(cache.stats().bytes).toBeLessThanOrEqual(cost * 2 + 1);
    calls.length = 0;
    await cache.searchTotal({ q: "aa" });
    await cache.searchTotal({ q: "cc" });
    expect(calls).toEqual([]); // both still cached
    await cache.searchTotal({ q: "bb" });
    expect(calls).toEqual(["bb"]); // the evicted one is recomputed
  });

  it("never caches a value larger than the whole budget, and honours the entry cap", async () => {
    const calls: string[] = [];
    const tiny = cachedStore(fakeInner(calls), fakePool({ generation: "g1" }), { autoWarm: false, maxBytes: 10 });
    await tiny.searchTotal({ q: "aa" });
    expect(tiny.stats().entries).toBe(0);
    const capped = cachedStore(fakeInner(calls), fakePool({ generation: "g1" }), { autoWarm: false, maxEntries: 2 });
    for (const q of ["aa", "bb", "cc"]) await capped.searchTotal({ q });
    expect(capped.stats().entries).toBe(2);
  });

  it("keeps the current generation and the entries when the generation read fails", async () => {
    const state: { generation: string | Error } = { generation: "g1" };
    const cache = cachedStore(fakeInner([]), fakePool(state), { autoWarm: false, generationTtlMs: 0 });
    await cache.searchTotal({ q: "aa" });
    state.generation = new Error("connection blip");
    await cache.searchTotal({ q: "aa" });
    expect(cache.stats()).toMatchObject({ entries: 1, hits: 1, flushes: 0, generation: "g1" });
    state.generation = "g2";
    await cache.searchTotal({ q: "aa" });
    expect(cache.stats()).toMatchObject({ flushes: 1, generation: "g2" });
  });

  it("reuses one generation read within the window", async () => {
    let reads = 0;
    const pool = { query: async () => (reads++, { rows: [{ generation: "g1" }] }) } as unknown as pg.Pool;
    const cache = cachedStore(fakeInner([]), pool, { autoWarm: false });
    await Promise.all([cache.searchTotal({ q: "aa" }), cache.searchTotal({ q: "bb" }), cache.searchTotal({ q: "cc" })]);
    await cache.searchTotal({ q: "dd" });
    expect(reads).toBe(1);
  });
});

// An inner store whose searchTotal answers only when the test says so, and records the signal each call received.
function gatedInner() {
  const calls: { q: string; signal: AbortSignal | undefined }[] = [];
  const pending: { resolve: (v: ReturnType<typeof totalOf>) => void; reject: (e: Error) => void }[] = [];
  const inner = {
    searchTotal: (f: { q?: string | null }, o?: { signal?: AbortSignal }) => {
      calls.push({ q: f.q ?? "", signal: o?.signal });
      return new Promise<ReturnType<typeof totalOf>>((resolve, reject) => pending.push({ resolve, reject }));
    },
  } as unknown as Store;
  return { inner, calls, pending };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("shared in-flight misses", () => {
  it("asks the inner store once for concurrent misses on one key and gives every caller the value", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    const all = Promise.all([cache.searchTotal({ q: "aa" }), cache.searchTotal({ q: "aa" }), cache.searchTotal({ q: "aa" })]);
    await tick();
    expect(g.calls).toHaveLength(1);
    g.pending[0]!.resolve(totalOf("aa"));
    const [a, b, c] = await all;
    expect(a).toEqual(totalOf("aa"));
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(g.calls).toHaveLength(1);
    // stats: each caller that found no entry is a miss (joined or not); the later lookup is a hit
    expect(cache.stats()).toMatchObject({ misses: 3, hits: 0, entries: 1 });
    await cache.searchTotal({ q: "aa" });
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 3 });
  });

  it("does not share between different keys", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    void cache.searchTotal({ q: "aa" });
    void cache.searchTotal({ q: "bb" });
    await tick();
    expect(g.calls.map((c) => c.q)).toEqual(["aa", "bb"]);
  });

  it("drops a rejected run: every waiter sees the rejection, nothing is cached, the next call runs again", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    const one = cache.searchTotal({ q: "aa" }).then(() => "ok", (e: Error) => e.message);
    const two = cache.searchTotal({ q: "aa" }).then(() => "ok", (e: Error) => e.message);
    await tick();
    g.pending[0]!.reject(new Error("boom"));
    expect(await Promise.all([one, two])).toEqual(["boom", "boom"]);
    expect(cache.stats().entries).toBe(0);
    const next = cache.searchTotal({ q: "aa" });
    await tick();
    expect(g.calls).toHaveLength(2);
    g.pending[1]!.resolve(totalOf("aa"));
    expect(await next).toEqual(totalOf("aa"));
  });

  it("releases only the caller that aborts; the others still get the shared run", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    const first = new AbortController();
    const aborted = cache.searchTotal({ q: "aa" }, { signal: first.signal }).then(() => "value", (e: Error) => e.name);
    const other = cache.searchTotal({ q: "aa" });
    await tick();
    first.abort();
    expect(await aborted).toBe("AbortError");
    expect(g.calls[0]!.signal?.aborted ?? false).toBe(false); // the run others await is not cancelled
    g.pending[0]!.resolve(totalOf("aa"));
    expect(await other).toEqual(totalOf("aa"));
    expect(g.calls).toHaveLength(1);
    expect(cache.stats().entries).toBe(1);
  });

  it("cancels the run once every waiter has aborted, and a later call starts a fresh one", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    const a = new AbortController();
    const b = new AbortController();
    const pa = cache.searchTotal({ q: "aa" }, { signal: a.signal }).catch((e: Error) => e.name);
    const pb = cache.searchTotal({ q: "aa" }, { signal: b.signal }).catch((e: Error) => e.name);
    await tick();
    a.abort();
    expect(g.calls[0]!.signal?.aborted).toBeFalsy();
    b.abort();
    expect(await Promise.all([pa, pb])).toEqual(["AbortError", "AbortError"]);
    expect(g.calls[0]!.signal?.aborted).toBe(true);
    void cache.searchTotal({ q: "aa" });
    await tick();
    expect(g.calls).toHaveLength(2);
  });

  it("does not store a run that started under an older generation, and a new-generation caller does not join it", async () => {
    const state: { generation: string | Error } = { generation: "g1" };
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool(state), { autoWarm: false, generationTtlMs: 0 });
    const old = cache.searchTotal({ q: "aa" });
    await tick();
    state.generation = "g2";
    const fresh = cache.searchTotal({ q: "aa" });
    await tick();
    expect(g.calls).toHaveLength(2); // the g2 caller started its own run
    g.pending[1]!.resolve({ ...totalOf("aa"), records: 2 });
    expect((await fresh).records).toBe(2);
    g.pending[0]!.resolve({ ...totalOf("aa"), records: 1 }); // the older run settles last: it must not overwrite the g2 entry
    expect((await old).records).toBe(1);
    expect(cache.stats()).toMatchObject({ entries: 1, generation: "g2" });
    expect((await cache.searchTotal({ q: "aa" })).records).toBe(2); // the g2 value is the cached one
    expect(g.calls).toHaveLength(2); // a hit, not a rerun
  });

  it("rejects an already-aborted caller on a miss without starting a run", async () => {
    const g = gatedInner();
    const cache = cachedStore(g.inner, fakePool({ generation: "g1" }), { autoWarm: false });
    const gone = new AbortController();
    gone.abort();
    await expect(cache.searchTotal({ q: "aa" }, { signal: gone.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(g.calls).toHaveLength(0);
    const next = cache.searchTotal({ q: "aa" });
    await tick();
    expect(g.calls).toHaveLength(1);
    g.pending[0]!.resolve(totalOf("aa"));
    expect(await next).toEqual(totalOf("aa"));
  });
});
