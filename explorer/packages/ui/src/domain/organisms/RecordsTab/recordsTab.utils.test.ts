import { describe, expect, it } from "vitest";
import { clearFacets, hasFacetsOn, selectedYear, toggleYear } from "./recordsTab.utils.ts";

describe("selectedYear", () => {
  it("reads a whole calendar year only", () => {
    expect(selectedYear({ from: "2023-01-01", to: "2023-12-31" })).toBe(2023);
    expect(selectedYear({ from: "2023-01-01", to: "2024-12-31" })).toBeUndefined();
    expect(selectedYear({ from: "2023-03-01", to: "2023-12-31" })).toBeUndefined();
    expect(selectedYear({})).toBeUndefined();
  });
});

describe("toggleYear", () => {
  it("replaces any dates with the year, and clears both on a second choice", () => {
    expect(toggleYear({ from: "2021-05-01" }, 2024)).toEqual({ from: "2024-01-01", to: "2024-12-31" });
    expect(toggleYear({ from: "2024-01-01", to: "2024-12-31", q: "x" }, 2024)).toEqual({ q: "x" });
  });
});

describe("clearFacets / hasFacetsOn", () => {
  it("clears only the fields the panel owns, by role", () => {
    const filter = { q: "x", channel: "CONTRACT", supplier: "1", authority: "2", badges: ["NO_VALUE"], valueBucket: "UP_TO_10K" } as const;
    expect(clearFacets({ ...filter, badges: ["NO_VALUE"] }, "authority")).toEqual({ q: "x", authority: "2", valueBucket: "UP_TO_10K" });
    expect(clearFacets({ ...filter, badges: ["NO_VALUE"] }, "supplier")).toEqual({ q: "x", supplier: "1", valueBucket: "UP_TO_10K" });
  });
  it("sees nothing to clear in a filter with only other fields", () => {
    expect(hasFacetsOn({ q: "x", county: "RO-BV", valueBucket: "UP_TO_10K" }, "authority")).toBe(false);
    expect(hasFacetsOn({ badges: [] }, "authority")).toBe(false);
    expect(hasFacetsOn({ signal: "SPLITTING" }, "authority")).toBe(true);
  });
});
