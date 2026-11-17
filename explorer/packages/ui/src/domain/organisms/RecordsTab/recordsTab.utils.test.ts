import { describe, expect, it } from "vitest";
import { selectedYear, toggleYear } from "./recordsTab.utils.ts";

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

