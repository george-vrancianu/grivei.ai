import type pg from "pg";
import { describe, expect, it } from "vitest";
import { postgresStore } from "./store.ts";

/** A pool whose database has no `financials` schema yet (a graph built before #179): Postgres answers 42P01 (undefined_table) to any query that names it. */
function poolWithoutFinancials(): pg.Pool {
  return {
    query: async (sql: string) => {
      if (sql.includes("financials.") || sql.includes("donations.")) throw Object.assign(new Error('relation "financials.statement" does not exist'), { code: "42P01" });
      if (sql.includes("amepip.snapshot")) return { rows: [] };
      if (sql.includes("aep.snapshot")) return { rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  } as unknown as pg.Pool;
}

describe("a graph without the financials schema (deployed before a rebuild)", () => {
  it("has no statements for an entity, so the Overview keeps working", async () => {
    expect(await postgresStore(poolWithoutFinancials(), { rollup: false }).financials("2000007", "2000007")).toEqual([]);
  });

  it("still lists the Reference sources, with no fiscal year for the financial statements", async () => {
    const sources = await postgresStore(poolWithoutFinancials(), { rollup: false }).referenceSources();
    expect(sources.map((s) => [s.id, s.dataThrough, s.fiscalYear])).toEqual([["AMEPIP", null, null], ["AEP", null, null], ["FINANCIAL_STATEMENTS", null, null], ["BANIPARTIDE", null, null]]);
  });

  it("has no firm donations either (BaniPartide's schema, #182), so the Overview keeps working", async () => {
    expect(await postgresStore(poolWithoutFinancials(), { rollup: false }).donations("2000007")).toBeNull();
  });

  it("does not hide another failure", async () => {
    const pool = { query: async () => { throw Object.assign(new Error("connection lost"), { code: "57P01" }); } } as unknown as pg.Pool;
    await expect(postgresStore(pool, { rollup: false }).financials("2000007", "2000007")).rejects.toThrow("connection lost");
  });
});

/** A pool whose database has no `aep` schema yet (a graph built before #180): every query that names it answers 42P01. */
function poolWithoutAep(): pg.Pool {
  return {
    query: async (sql: string) => {
      if (sql.includes("aep.")) throw Object.assign(new Error('relation "aep.authority" does not exist'), { code: "42P01" });
      if (sql.includes("donations.")) throw Object.assign(new Error('relation "donations.source_file" does not exist'), { code: "42P01" });
      if (sql.includes("amepip.snapshot") || sql.includes("financials.")) return { rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  } as unknown as pg.Pool;
}

describe("a graph without the aep schema (deployed before a rebuild)", () => {
  it("has no Leadership list and no Party, so entity and Record pages keep working", async () => {
    const store = postgresStore(poolWithoutAep(), { rollup: false });
    expect(await store.leadership("51000501")).toBeNull();
    expect(await store.recordParty("DA95000002")).toBeNull();
  });

  it("offers no party to the filter (#181), so the main screen shows no Party chip and keeps working", async () => {
    expect(await postgresStore(poolWithoutAep(), { rollup: false }).partyOptions()).toEqual([]);
  });

  it("still lists the Reference sources, with no data-through date for AEP", async () => {
    const sources = await postgresStore(poolWithoutAep(), { rollup: false }).referenceSources();
    expect(sources.map((s) => [s.id, s.dataThrough])).toEqual([["AMEPIP", null], ["AEP", null], ["FINANCIAL_STATEMENTS", null], ["BANIPARTIDE", null]]);
  });
});

/** A pool answering the data-through reads: the stored table (`stored` rows, or an error), and the old aggregate query a graph built before the table still gets. */
function dataThroughPool(stored: { rows: unknown[] } | Error, aggregate: unknown[] = []) {
  const seen: string[] = [];
  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      seen.push(`${sql} ${JSON.stringify(params ?? [])}`);
      if (sql.includes("core.data_through")) {
        if (stored instanceof Error) throw stored;
        return stored;
      }
      return { rows: aggregate };
    },
  } as unknown as pg.Pool;
  return { pool, seen };
}

describe("the data-through dates", () => {
  const missing = Object.assign(new Error('relation "core.data_through" does not exist'), { code: "42P01" });

  it("are the rows the rebuild stored, one read per Source", async () => {
    const seap = [{ kind: "CONTRACT", date: "2026-04-02" }];
    const a = dataThroughPool({ rows: seap });
    expect(await postgresStore(a.pool, { rollup: false }).dataThrough()).toEqual(seap);
    expect(a.seen).toHaveLength(1);
    expect(a.seen[0]).toContain('["SEAP"]');
    const onrc = [{ kind: "REGISTRATION", date: "2026-05-06" }];
    const b = dataThroughPool({ rows: onrc });
    expect(await postgresStore(b.pool, { rollup: false }).onrcDataThrough()).toEqual(onrc);
    expect(b.seen[0]).toContain('["ONRC"]');
  });

  it("are none for a Source with no stored row", async () => {
    expect(await postgresStore(dataThroughPool({ rows: [] }).pool, { rollup: false }).onrcDataThrough()).toEqual([]);
  });

  it("fall back to the aggregate on a graph built before the table existed", async () => {
    const seap = dataThroughPool(missing, [{ kind: "DA", date: "2022-03-31" }]);
    expect(await postgresStore(seap.pool, { rollup: false }).dataThrough()).toEqual([{ kind: "DA", date: "2022-03-31" }]);
    expect(seap.seen[1]).toContain("seap.record");
    const onrc = dataThroughPool(missing, [{ kind: "REGISTRATION", date: "2026-05-06" }]);
    expect(await postgresStore(onrc.pool, { rollup: false }).onrcDataThrough()).toEqual([{ kind: "REGISTRATION", date: "2026-05-06" }]);
    expect(onrc.seen[1]).toContain("onrc.snapshot");
  });

  it("do not hide another failure", async () => {
    const down = Object.assign(new Error("connection lost"), { code: "57P01" });
    await expect(postgresStore(dataThroughPool(down).pool, { rollup: false }).dataThrough()).rejects.toThrow("connection lost");
    await expect(postgresStore(dataThroughPool(down).pool, { rollup: false }).onrcDataThrough()).rejects.toThrow("connection lost");
  });
});
