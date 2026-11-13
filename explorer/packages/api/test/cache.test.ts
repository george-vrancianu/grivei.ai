// Unit tests of the result cache's memory bound and eviction (#70); no database: a fake pool answers the generation read.
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

describe("cache warming", () => {
  const poolWithPrefixes = (prefixes: string[]) =>
    ({ query: async (sql: string) => ({ rows: /rollup_prefix/.test(sql) ? prefixes.map((prefix) => ({ prefix })) : [{ generation: "g1" }] }) }) as unknown as pg.Pool;

  // every store method the warm job and the MainScreen statements use, answering with something small and counting each call
  function countingInner(calls: string[]): Store {
    const entities = (side: string) => ({ count: 2, countEstimated: false, rows: ["k1", "k2"].map((k) => ({ entity: { key: `${side}-${k}` }, matched: totalOf("") })) });
    return {
      searchTotal: async () => (calls.push("total"), totalOf("")),
      searchMap: async (side: string) => (calls.push(`map ${side}`), { counties: [], national: totalOf(""), unplaced: null }),
      searchEntities: async (side: string) => (calls.push(`entities ${side}`), entities(side)),
      entitySignalCounts: async (side: string, _f: unknown, keys: string[]) => (calls.push(`signal-counts ${side}`), new Map(keys.map((k, i) => [k, i]))),
      searchRecords: async () => (calls.push("records"), { count: 0, rows: [] }),
      records: async () => (calls.push("records"), { count: 0, rows: [] }),
      goTo: async () => (calls.push("goto"), null),
    } as unknown as Store;
  }

  it("warms each tab's Signal counts, so a warmed MainScreen makes no further store calls", async () => {
    const calls: string[] = [];
    const cache = cachedStore(countingInner(calls), poolWithPrefixes(["ab"]), { autoWarm: false });
    const report = await cache.warm();
    expect(report).toMatchObject({ prefixes: 1, failed: 0, statements: 8 + 9 });
    expect(calls.filter((c) => c.startsWith("signal-counts")).sort()).toEqual(["signal-counts AUTHORITY", "signal-counts AUTHORITY", "signal-counts SUPPLIER", "signal-counts SUPPLIER"]);
    calls.length = 0;
    // what the MainScreen resolvers ask for the empty filter and the 2-character prefix: the page of each tab, then the page's keys' counts
    for (const f of [{}, { q: "ab" }]) {
      for (const side of ["AUTHORITY", "SUPPLIER"] as const) {
        const page = await cache.searchEntities(side, f, { limit: 50, offset: 0 });
        await cache.entitySignalCounts(side, f, page.rows.map((r) => r.entity.key));
      }
    }
    expect(calls).toEqual([]);
  });
});
