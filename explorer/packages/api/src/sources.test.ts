import { describe, expect, it } from "vitest";
import { adapterOf, plannedSources, SOURCE_ADAPTERS } from "./sources.ts";

describe("plannedSources", () => {
  it("lists every planned Source while the registry holds none of them", () => {
    expect(plannedSources(["SEAP"]).map((s) => s.id)).toEqual(["ONRC", "ANI", "MFINANTE", "JUST"]);
  });

  it("drops a planned Source once the registry holds it, so it is never listed twice", () => {
    const ids = plannedSources(["SEAP", "ONRC"]).map((s) => s.id);
    expect(ids).not.toContain("ONRC");
    expect(ids).toEqual(["ANI", "MFINANTE", "JUST"]);
  });

  it("marks the rest as not harvested, with no dates", () => {
    for (const s of plannedSources([])) expect(s).toMatchObject({ harvested: false, dataThrough: [] });
  });
});

describe("adapterOf", () => {
  it("returns the adapter of a registry Source", () => {
    expect(adapterOf("SEAP")).toBe(SOURCE_ADAPTERS.SEAP);
  });

  it("names the Source in the error when a registry row has no adapter (a database built by a newer pipeline)", () => {
    expect(() => adapterOf("ONRC")).toThrow(/ONRC/);
    expect(() => adapterOf("ONRC")).toThrow(/adapter/);
  });
});
