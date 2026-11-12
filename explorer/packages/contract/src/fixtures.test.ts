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
});
