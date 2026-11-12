import { describe, expect, it } from "vitest";
import type { GapCellData } from "../../types.ts";
import { crawlOnlyCells, explainedCells, gridShape, kindsOf, quarterBounds, quarterInWindow, quarterSpan, windowActive } from "./coverageGrid.utils.ts";

const cell = (quarter: string, kind: string, state: GapCellData["state"], o: Partial<GapCellData> = {}): GapCellData => ({ quarter, kind, state, rule: null, note: null, records: 0, dataThrough: null, ...o });

describe("quarters", () => {
  it("knows each quarter's first and last day, and rejects what is not a quarter", () => {
    expect(quarterBounds("2024-Q1")).toEqual({ start: "2024-01-01", end: "2024-03-31" });
    expect(quarterBounds("2024-Q2")).toEqual({ start: "2024-04-01", end: "2024-06-30" });
    expect(quarterBounds("2024-Q4")).toEqual({ start: "2024-10-01", end: "2024-12-31" });
    expect(quarterBounds("2024-Q5")).toBeNull();
  });

  it("spans every quarter from the earliest to the latest, none skipped", () => {
    expect(quarterSpan(["2022-Q4", "2021-Q3", "2022-Q1"])).toEqual(["2021-Q3", "2021-Q4", "2022-Q1", "2022-Q2", "2022-Q3", "2022-Q4"]);
    expect(quarterSpan([])).toEqual([]);
  });
});

describe("the date window", () => {
  it("includes a quarter that overlaps it, even by one day", () => {
    const window = { from: "2023-03-31", to: "2023-07-01" };
    expect(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4", "2022-Q4"].filter((q) => quarterInWindow(q, window))).toEqual(["2023-Q1", "2023-Q2", "2023-Q3"]);
  });

  it("handles an open start and an open end", () => {
    expect(quarterInWindow("2021-Q1", { from: null, to: "2021-02-01" })).toBe(true);
    expect(quarterInWindow("2021-Q2", { to: "2021-02-01" })).toBe(false);
    expect(quarterInWindow("2030-Q1", { from: "2024-07-15" })).toBe(true);
    expect(quarterInWindow("2024-Q2", { from: "2024-07-15" })).toBe(false);
  });

  it("highlights nothing when no end is set", () => {
    expect(windowActive({ from: null, to: null })).toBe(false);
    expect(windowActive(undefined)).toBe(false);
    expect(quarterInWindow("2024-Q1", { from: null, to: null })).toBe(false);
  });
});

describe("the grid's shape", () => {
  it("lists SEAP's kinds in their order, then other kinds alphabetically", () => {
    const cells = [cell("2024-Q1", "AWARD_NOTICE", "LOADED"), cell("2024-Q1", "ZED", "LOADED"), cell("2024-Q1", "DA", "LOADED"), cell("2024-Q1", "ALPHA", "LOADED")];
    expect(kindsOf(cells)).toEqual(["DA", "AWARD_NOTICE", "ALPHA", "ZED"]);
    expect(gridShape(cells).at("2024-Q1", "DA")).toBe(cells[2]);
    expect(gridShape(cells).at("2024-Q2", "DA")).toBeUndefined();
  });

  it("explains the flagged cells (a quarantined one has nothing to explain) and counts crawl-only", () => {
    const cells = [
      cell("2024-Q4", "DA", "NOT_YET_LOADED"),
      cell("2024-Q4", "DAN", "NOT_YET_LOADED", { rule: "AWAITING_BULK_FILE" }),
      cell("2024-Q3", "CONTRACT", "CRAWLED_PROVISIONAL", { crawlOnly: 4 }),
      cell("2024-Q2", "DA", "LOADED"),
      cell("2024-Q1", "DAN", "KNOWN_GAP", { rule: "HAND_ENTERED", note: "n" }),
    ];
    expect(explainedCells(cells).map((c) => `${c.quarter} ${c.kind}`)).toEqual(["2024-Q1 DAN", "2024-Q4 DAN"]);
    expect(crawlOnlyCells(cells).map((c) => c.crawlOnly)).toEqual([4]);
  });
});
