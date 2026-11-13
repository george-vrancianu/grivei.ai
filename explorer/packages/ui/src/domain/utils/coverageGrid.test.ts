import { describe, expect, it } from "vitest";
import type { GapCellData } from "../types.ts";
import { crawlOnlyCells, explainedCells, gridShape, kindsOf, quarterBounds, quarterInWindow, quarterSpan, reasonOf, windowActive, yearGroups } from "./coverageGrid.ts";

const cell = (quarter: string, kind: string, state: GapCellData["state"], o: Partial<GapCellData> = {}): GapCellData => ({ quarter, kind, state, rule: null, note: null, records: 0, crawlOnly: 0, dataThrough: null, ...o });

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

  it("explains the flagged cells (no Not yet loaded cell, whatever its rule) and counts crawl-only", () => {
    const cells = [
      cell("2024-Q4", "DA", "NOT_YET_LOADED"),
      cell("2024-Q4", "DAN", "NOT_YET_LOADED", { rule: "AWAITING_BULK_FILE" }),
      cell("2024-Q3", "CONTRACT", "CRAWLED_PROVISIONAL", { crawlOnly: 4 }),
      cell("2024-Q2", "DA", "LOADED"),
      cell("2024-Q1", "DAN", "KNOWN_GAP", { rule: "HAND_ENTERED", note: "n" }),
    ];
    expect(explainedCells(cells).map((c) => `${c.quarter} ${c.kind}`)).toEqual(["2024-Q1 DAN"]);
    expect(crawlOnlyCells(cells).map((c) => c.crawlOnly)).toEqual([4]);
  });

  it("lists the crawl-only cells in the page's order: quarter, then SEAP's kind order", () => {
    const cells = [cell("2024-Q1", "AWARD_NOTICE", "CRAWLED_PROVISIONAL", { crawlOnly: 1 }), cell("2024-Q1", "DA", "CRAWLED_PROVISIONAL", { crawlOnly: 2 }), cell("2024-Q1", "CONTRACT", "CRAWLED_PROVISIONAL", { crawlOnly: 3 })];
    expect(crawlOnlyCells(cells).map((c) => c.kind)).toEqual(["DA", "CONTRACT", "AWARD_NOTICE"]);
  });
});

describe("the reason of a cell", () => {
  const copy = { rules: { HAND_ENTERED: "hand", COUNT_BELOW_NEIGHBOURS: "count", NO_PRIOR_CALL_BEFORE_BACKFILL: "no call", AWAITING_BULK_FILE: "awaiting, not published" }, notYetLoaded: "awaiting a file" };

  it("is the note verbatim, else the rule's wording, else nothing", () => {
    expect(reasonOf(cell("2024-Q1", "DAN", "KNOWN_GAP", { rule: "HAND_ENTERED", note: "n" }), copy)).toBe("n");
    expect(reasonOf(cell("2024-Q1", "DA", "CRAWLED_PROVISIONAL", { rule: "AWAITING_BULK_FILE" }), copy)).toBe("awaiting, not published");
    expect(reasonOf(cell("2024-Q1", "DA", "LOADED"), copy)).toBeNull();
  });

  it("is the same sentence for every Not yet loaded cell, with or without a rule", () => {
    expect(reasonOf(cell("2024-Q1", "DA", "NOT_YET_LOADED"), copy)).toBe("awaiting a file");
    expect(reasonOf(cell("2024-Q4", "DA", "NOT_YET_LOADED", { rule: "AWAITING_BULK_FILE" }), copy)).toBe("awaiting a file");
  });
});

describe("yearGroups", () => {
  it("makes one label per year over its consecutive quarters, and keeps a stray name on its own", () => {
    expect(yearGroups(["2023-Q4", "2024-Q1", "2024-Q2", "odd"])).toEqual([
      { label: "2023", span: 1 },
      { label: "2024", span: 2 },
      { label: "odd", span: 1 },
    ]);
  });
});
