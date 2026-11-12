import { isEnumType, isInputObjectType, isListType, isNonNullType, getNamedType, type GraphQLInputType } from "graphql";
import { describe, expect, it } from "vitest";
import { RECORD_FILTER_URL, URL_ONLY_KEYS } from "./filter-keys.ts";
import { loadSchema } from "./schema.ts";

const schema = loadSchema();
const filter = schema.getType("RecordFilter");
if (!isInputObjectType(filter)) throw new Error("RecordFilter is not an input type");
const fields = filter.getFields();

describe("RecordFilter <-> URL search state", () => {
  it("has a URL key for every RecordFilter field and no key for anything else", () => {
    expect(Object.keys(RECORD_FILTER_URL).sort()).toEqual(Object.keys(fields).sort());
  });
  it("uses each URL key once, and never one reserved for tab or page", () => {
    const keys = [...Object.values(RECORD_FILTER_URL).map((s) => s.key), ...Object.values(URL_ONLY_KEYS)];
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("describes each field's shape the way the SDL types it", () => {
    for (const [name, spec] of Object.entries(RECORD_FILTER_URL)) {
      let t: GraphQLInputType = fields[name]!.type;
      if (isNonNullType(t)) t = t.ofType;
      const list = isListType(t);
      const named = getNamedType(t);
      expect(spec.repeatable, `${name} repeatable`).toBe(list);
      expect(spec.encoding === "enum", `${name} enum`).toBe(isEnumType(named));
      if (spec.encoding === "date") expect(named.name).toBe("Date");
      if (spec.encoding === "boolean") expect(named.name).toBe("Boolean");
    }
  });
});
