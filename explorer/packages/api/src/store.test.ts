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

  it("still lists the Reference sources, with no data-through date for AEP", async () => {
    const sources = await postgresStore(poolWithoutAep(), { rollup: false }).referenceSources();
    expect(sources.map((s) => [s.id, s.dataThrough])).toEqual([["AMEPIP", null], ["AEP", null], ["FINANCIAL_STATEMENTS", null], ["BANIPARTIDE", null]]);
  });
});
