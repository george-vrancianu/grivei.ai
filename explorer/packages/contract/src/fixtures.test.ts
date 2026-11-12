import { parse } from "graphql";
import { describe, expect, it } from "vitest";
import { fixtures } from "./fixtures/index.ts";
import { persistedOperations } from "./operations.ts";
import { observedStates, REQUIRED_STATES } from "./observed-states.ts";
import { loadSchema } from "./schema.ts";
import { validateResponse } from "./validate-response.ts";

const schema = loadSchema();
const operations = persistedOperations();
const sets = Object.entries(fixtures) as [string, readonly { name: string; kind: string; variables: unknown; data: unknown }[]][];

describe("fixtures", () => {
  it("cover exactly the persisted operations", () => {
    expect(sets.map(([n]) => n).sort()).toEqual(operations.map((o) => o.name).sort());
  });

  for (const [opName, set] of sets) {
    const op = operations.find((o) => o.name === opName);
    describe(opName, () => {
      it("has a typical fixture and an empty or extreme one, with unique names", () => {
        expect(set.some((f) => f.kind === "typical")).toBe(true);
        expect(set.some((f) => f.kind === "empty" || f.kind === "extreme")).toBe(true);
        expect(new Set(set.map((f) => f.name)).size).toBe(set.length);
      });
      for (const f of set) {
        it(`${f.name} is a valid response to the operation, with valid variables`, () => {
          expect(op, `no operation named ${opName}`).toBeDefined();
          const problems = validateResponse(schema, parse(op!.document), f.data, f.variables as Record<string, unknown>);
          expect(problems).toEqual([]);
        });
      }
    });
  }

  it("between them show every state the screens must handle", () => {
    const seen = new Set<string>();
    for (const [, set] of sets) for (const f of set) for (const s of observedStates(f.data)) seen.add(s);
    expect(REQUIRED_STATES.filter((s) => !seen.has(s))).toEqual([]);
  });

  describe("invariants the schema documents but cannot type", () => {
    type Node = { [k: string]: unknown };
    const everyObject = (): Node[] => {
      const out: Node[] = [];
      const visit = (n: unknown) => {
        if (Array.isArray(n)) return n.forEach(visit);
        if (n === null || typeof n !== "object") return;
        out.push(n as Node);
        Object.values(n).forEach(visit);
      };
      for (const [, set] of sets) for (const f of set) visit(f.data);
      return out;
    };

    it("never names or links a natural person (ADR 0003)", () => {
      const people = everyObject().filter((o) => o.naturalPerson === true);
      expect(people.length).toBeGreaterThan(0);
      for (const p of people) {
        expect(p.entity ?? null, "entity").toBeNull();
        if ("publishedName" in p) expect(p.publishedName, "publishedName").toBeNull();
      }
    });

    it("splits a consortium Record's value equally between its winners (odd bani to the first), so the shares sum to the value", () => {
      const consortia = everyObject().filter((o) => Array.isArray(o.winners) && o.winners.length > 1 && o.value != null);
      expect(consortia.length).toBeGreaterThan(0);
      for (const r of consortia) {
        const winners = r.winners as Node[];
        const value = BigInt(r.value as string);
        const shares = winners.map((w) => BigInt(w.share as string));
        const n = BigInt(winners.length);
        shares.forEach((s, i) => expect(s, `${String(r.code)} winner ${i}`).toBe(value / n + (i === 0 ? value % n : 0n))); // the counting rule: remainder bani stay with the first winner
        expect(shares.reduce((a, b) => a + b, 0n), String(r.code)).toBe(value);
      }
    });

    it("never traces a name-only entity to ANAF, which knows no CUI for it", () => {
      const named = everyObject().filter((o) => o.identity === "NAME_ONLY" && Array.isArray(o.provenance));
      expect(named.length).toBeGreaterThan(0);
      for (const e of named) for (const p of e.provenance as Node[]) expect(p.source, String(e.key)).not.toBe("ANAF");
    });

    it("puts the Unplaced tile on the authority side and the unknown-supplier-county bucket on the supplier side", () => {
      const maps = everyObject().filter((o) => "unknownSupplierCounty" in o && "unplaced" in o);
      expect(maps.length).toBeGreaterThan(0);
      for (const m of maps) {
        if (m.unplaced !== null) expect(m.side).toBe("AUTHORITY");
        if (m.unknownSupplierCounty !== null) expect(m.side).toBe("SUPPLIER");
      }
    });

    it("builds each Signal's numbers the way its rule says (over the cap in force; splitting above the cap, each at or under it)", () => {
      const caps = new Set([13_506_000n, 27_012_000n, 45_020_000n, 90_040_000n]); // bani: 135,060 / 270,120 / 450,200 / 900,400 RON
      const overCap = everyObject().filter((o) => (o.numbers as Node | undefined)?.__typename === "OverCapNumbers");
      const splitting = everyObject().filter((o) => (o.numbers as Node | undefined)?.__typename === "SplittingNumbers");
      expect(overCap.length).toBeGreaterThan(0);
      expect(splitting.length).toBeGreaterThan(0);
      for (const sig of overCap) {
        const n = sig.numbers as { value: string; cap: string };
        expect(caps.has(BigInt(n.cap)), "a statutory cap").toBe(true);
        expect(BigInt(n.value), "value above the cap").toBeGreaterThan(BigInt(n.cap));
        // the 10 Sep 2022 change: 135,060 / 450,200 before, 270,120 / 900,400 after
        const before = (sig.date as string) < "2022-09-10";
        expect([13_506_000n, 45_020_000n].includes(BigInt(n.cap))).toBe(before);
      }
      for (const sig of splitting) {
        const n = sig.numbers as { sum: string; cap: string; purchases: number };
        expect(caps.has(BigInt(n.cap)), "a statutory cap").toBe(true);
        expect(BigInt(n.sum), "together above the cap").toBeGreaterThan(BigInt(n.cap));
        expect(BigInt(n.sum) / BigInt(n.purchases), "each at or under the cap, on average").toBeLessThanOrEqual(BigInt(n.cap));
      }
    });
  });
});
