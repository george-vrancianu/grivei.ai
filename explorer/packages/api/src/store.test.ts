import type pg from "pg";
import { describe, expect, it } from "vitest";
import { postgresStore } from "./store.ts";

/** A pool whose database has no `financials` schema yet (a graph built before #179): Postgres answers 42P01 (undefined_table) to any query that names it. */
function poolWithoutFinancials(): pg.Pool {
  return {
    query: async (sql: string) => {
      if (sql.includes("financials.")) throw Object.assign(new Error('relation "financials.statement" does not exist'), { code: "42P01" });
      if (sql.includes("amepip.snapshot")) return { rows: [] };
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
    expect(sources.map((s) => [s.id, s.dataThrough, s.fiscalYear])).toEqual([["AMEPIP", null, null], ["FINANCIAL_STATEMENTS", null, null]]);
  });

  it("does not hide another failure", async () => {
    const pool = { query: async () => { throw Object.assign(new Error("connection lost"), { code: "57P01" }); } } as unknown as pg.Pool;
    await expect(postgresStore(pool, { rollup: false }).financials("2000007", "2000007")).rejects.toThrow("connection lost");
  });
});
