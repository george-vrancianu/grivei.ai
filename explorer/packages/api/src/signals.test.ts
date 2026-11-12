import type pg from "pg";
import { describe, expect, it } from "vitest";
import { signalObject, signalsOfRecords, signalStore, type SignalStore } from "./signals.ts";
import type { EntityRow } from "./store.ts";

const entity = (key: string): EntityRow => ({ key, displayName: `entity ${key}` }) as EntityRow;

const raw = (id: number, authority: string, suppliers: string[]) => ({
  ordinal: id, rule: "OVER_CAP", date: "2024-03-01", first_date: "2024-03-01", authority_key: authority, supplier_keys: suppliers,
  record_count: 1, value: "100", numbers: {}, reproduce: {}, data_through: "2024-12-31", n: 3,
});

/** A pool whose every query answers `rows`, and a counting entity loader. */
function fixture(rows: object[]) {
  const calls: string[][] = [];
  const query = async () => ({ rows });
  const pool = { query, connect: async () => ({ query, release: () => undefined }) } as unknown as pg.Pool;
  const entitiesOf = async (keys: string[]) => {
    calls.push(keys);
    return new Map(keys.filter((k) => k !== "9").map((k) => [k, entity(k)]));
  };
  return { pool, entitiesOf, calls };
}

describe("entities of a page of Signals", () => {
  it("loads them once for the whole page of an entity's Signals", async () => {
    const f = fixture([raw(1, "A1", ["S1", "S2"]), raw(2, "A2", ["S2", "9"]), raw(3, "A1", [])]);
    const store = signalStore({ pool: f.pool, entitiesOf: f.entitiesOf, rowsOf: async () => [], recordColumns: "code" });
    const { rows } = await store.roleSignals({}, { limit: 20, offset: 0, order: "DATE_DESC" });
    expect(f.calls).toHaveLength(1);
    expect([...f.calls[0]!].sort()).toEqual(["9", "A1", "A2", "S1", "S2"]);
    expect(rows.map((s) => s.authority?.key)).toEqual(["A1", "A2", "A1"]);
    expect(rows.map((s) => s.suppliers.map((e) => e.key))).toEqual([["S1", "S2"], ["S2"], []]); // an unknown key is skipped
  });

  it("loads them once for the Signals of a page of Records, one object per Signal", async () => {
    const f = fixture([{ record_code: "R1", ...raw(1, "A1", ["S1"]) }, { record_code: "R2", ...raw(1, "A1", ["S1"]) }, { record_code: "R2", ...raw(2, "A2", ["S2"]) }]);
    const bySignal = await signalsOfRecords(f.pool, ["R1", "R2"], f.entitiesOf);
    expect(f.calls).toHaveLength(1);
    expect(bySignal.get("R1")!.map((s) => s.authority?.key)).toEqual(["A1"]);
    expect(bySignal.get("R2")!.map((s) => s.suppliers[0]?.key)).toEqual(["S1", "S2"]);
  });

  it("asks nothing for a page with no Signals", async () => {
    const f = fixture([]);
    const store = signalStore({ pool: f.pool, entitiesOf: f.entitiesOf, rowsOf: async () => [], recordColumns: "code" });
    expect((await store.roleSignals({}, { limit: 20, offset: 0, order: "DATE_DESC" })).rows).toEqual([]);
    expect((await signalsOfRecords(f.pool, [], f.entitiesOf)).size).toBe(0);
    expect(f.calls).toHaveLength(0);
  });

  it("serves a Signal's authority and suppliers without asking the store again", async () => {
    const f = fixture([raw(1, "A1", ["S1"])]);
    const store = signalStore({ pool: f.pool, entitiesOf: f.entitiesOf, rowsOf: async () => [], recordColumns: "code" });
    const { rows } = await store.roleSignals({}, { limit: 20, offset: 0, order: "DATE_DESC" });
    const obj = signalObject(store as SignalStore, rows[0]!, { entityObject: (e) => ({ key: e.key }), recordRow: (r) => r });
    expect(await obj.authority()).toEqual({ key: "A1" });
    expect(await obj.suppliers()).toEqual([{ key: "S1" }]);
    expect(f.calls).toHaveLength(1);
  });
});
