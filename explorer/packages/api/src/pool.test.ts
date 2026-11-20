import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import type pg from "pg";
import { createPool } from "./pool.ts";
import { cancellableQuery } from "./search.ts";

describe("createPool", () => {
  it("logs an error on an idle client instead of throwing", async () => {
    const logs: string[] = [];
    const pool = createPool({ connectionString: "postgresql://x:y@127.0.0.1:1/z" }, (m) => logs.push(m));
    expect(() => pool.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("Connection terminated unexpectedly");
    await pool.end();
  });

  it("keeps a listener on a client for its whole life, checked out included", async () => {
    const logs: string[] = [];
    const pool = createPool({ connectionString: "postgresql://x:y@127.0.0.1:1/z" }, (m) => logs.push(m));
    const client = new EventEmitter();
    pool.emit("connect", client as unknown as pg.PoolClient);
    expect(() => client.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    expect(logs).toHaveLength(1);
    await pool.end();
  });
});

describe("cancellableQuery on a lost connection", () => {
  const poolWith = (query: () => Promise<never>) => {
    const released: unknown[] = [];
    const client = { query, release: (err?: unknown) => released.push(err), processID: 1 };
    return { pool: { connect: async () => client } as unknown as pg.Pool, released };
  };

  it("releases the client with the error so the pool discards it", async () => {
    const lost = new Error("Connection terminated unexpectedly");
    const { pool, released } = poolWith(() => Promise.reject(lost));
    await expect(cancellableQuery(pool, undefined, "SELECT 1")).rejects.toBe(lost);
    expect(released).toEqual([lost]);
  });

  it("releases the client normally after a statement error (it is still usable)", async () => {
    const failed = Object.assign(new Error("syntax error"), { code: "42601" });
    const { pool, released } = poolWith(() => Promise.reject(failed));
    await expect(cancellableQuery(pool, undefined, "SELEC")).rejects.toBe(failed);
    expect(released).toEqual([undefined]);
  });
});
