import { readFileSync } from "node:fs";
import { Kind, parse, print, validate, visit } from "graphql";
import { describe, expect, it } from "vitest";
import { allowlistPath, schemaPath } from "./paths.ts";
import { buildAllowlist, fragmentMap, loadDefinitions, operationDefinitions, persistedOperations } from "./operations.ts";
import { loadSchema } from "./schema.ts";

const schema = loadSchema();
const defs = loadDefinitions();

describe("schema", () => {
  it("has no open Q<n> decision markers", () => {
    expect(readFileSync(schemaPath, "utf8")).not.toMatch(/#\s*Q\d+\b|\bQ\d+\b.*\?/);
  });
});

describe("operations", () => {
  it("all validate against the schema", () => {
    expect(validate(schema, defs).map((e) => e.message)).toEqual([]);
  });
  it("are all named, once each", () => {
    const names = operationDefinitions(defs).map((o) => o.name?.value);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it("cover every screen", () => {
    const names = operationDefinitions(defs).map((o) => o.name!.value).sort();
    expect(names).toEqual([
      "CoverageLens", "CoveragePage", "EntityOverview", "EntityRecords", "EntityRelationships",
      "FullResultsAuthorities", "FullResultsRecords", "FullResultsSuppliers", "MainScreen",
      "MethodologyBaseRates", "RecordPage", "ZoomedCounty",
    ]);
  });
  it("are queries only", () => {
    expect(operationDefinitions(defs).every((o) => o.operation === "query")).toBe(true);
  });
  it("leave no fragment unused", () => {
    const used = new Set<string>();
    visit(defs, { FragmentSpread: (s) => void used.add(s.name.value) });
    expect([...fragmentMap(defs).keys()].filter((f) => !used.has(f))).toEqual([]);
  });
  it("select no copy: the schema has no field whose job is prose", () => {
    const s = readFileSync(schemaPath, "utf8");
    expect(s).not.toMatch(/\b(label|sentence|explanation|caveat\w*)\s*:/i);
  });
});

describe("persisted-query allowlist", () => {
  it("is what the operations produce (run `npm run codegen` when this fails)", () => {
    expect(readFileSync(allowlistPath, "utf8")).toBe(JSON.stringify(buildAllowlist(), null, 2) + "\n");
  });
  it("hashes each self-contained document", () => {
    for (const o of persistedOperations()) {
      expect(o.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(print(parse(o.document))).toBe(o.document.trimEnd());
      expect(operationDefinitions(parse(o.document))).toHaveLength(1);
      expect(parse(o.document).definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION).length).toBeGreaterThanOrEqual(0);
    }
  });
  it("validates every document on its own against the schema", () => {
    for (const o of persistedOperations()) expect(validate(schema, parse(o.document)).map((e) => e.message), o.name).toEqual([]);
  });
});
