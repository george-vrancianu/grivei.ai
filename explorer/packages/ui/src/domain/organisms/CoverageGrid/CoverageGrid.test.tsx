import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { CURRENT_QUARTER, HAND_ENTERED_NOTE, cellsBetween, fixturePageContent, sampleGrid } from "../../samples/coverageGrid.ts";
import { CoverageGrid } from "./index.ts";

const NBSP = /\s/g;
const names = (cells: HTMLElement[]) => cells.map((c) => (c.getAttribute("aria-label") ?? "").replace(NBSP, " "));
const cellOf = (quarter: string, kind: string, locale: "en" | "ro" = "en") => {
  const copy = sampleCopy.coverageGrid(locale);
  const row = screen.getByRole("row", { name: new RegExp(`^${copy.kinds[kind]}`) });
  const col = screen.getByRole("columnheader", { name: copy.quarterName(quarter) });
  const index = within(row.closest("table")!).getAllByRole("columnheader").indexOf(col);
  return within(row).getAllByRole("cell")[index - 1]!;
};

describe("the Coverage grid's cells", () => {
  it("names each of the six states with its quarter, kind and Record count", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(cellOf("2022-Q1", "CONTRACT")).toHaveAccessibleName(/^Contracts, Q1 2022: Loaded\. 17,\d{3} Records\. data through 31 March 2022$/);
    expect(cellOf("2025-Q2", "DAN")).toHaveAccessibleName(/^Direct purchase award notifications, Q2 2025: Known gap\. 0 Records\./);
    expect(cellOf("2024-Q4", "CONTRACT")).toHaveAccessibleName(/^Contracts, Q4 2024: Possibly incomplete\. 6,900 Records\. Fewer than 60% of the median row count of the surrounding quarters\./);
    expect(cellOf("2021-Q1", "AWARD_NOTICE")).toHaveAccessibleName(/^Award notices, Q1 2021: Not visible in the source\. 0 Records\./);
    expect(cellOf(CURRENT_QUARTER, "CONTRACT")).toHaveAccessibleName(/^Contracts, Q3 2025: Crawled, provisional\. 3,100 Records\. Awaiting bulk file/);
    expect(cellOf(CURRENT_QUARTER, "DA")).toHaveAccessibleName(/^Direct purchases, Q3 2025: Not yet loaded\. 0 Records\. Awaiting a bulk file for this quarter and record kind$/);
  });

  it("shows the hand-entered note verbatim, and the crawl-only count and data-through where present", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(cellOf("2025-Q2", "DAN")).toHaveAccessibleName(expect.stringContaining(HAND_ENTERED_NOTE));
    const crawled = cellOf(CURRENT_QUARTER, "CONTRACT");
    expect(crawled).toHaveAccessibleName(expect.stringContaining("140 of them not in bulk data"));
    expect(crawled).toHaveAccessibleName(expect.stringContaining("data through 19 September 2025"));
  });

  it("reads a quarantined cell exactly like any other not-yet-loaded cell, so the quarantine is never exposed", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    const quarantined = cellOf("2023-Q3", "DA").getAttribute("aria-label");
    const awaiting = cellOf(CURRENT_QUARTER, "DA").getAttribute("aria-label");
    expect(quarantined).toBe("Direct purchases, Q3 2023: Not yet loaded. 0 Records. Awaiting a bulk file for this quarter and record kind");
    expect(awaiting).toBe(quarantined!.replace("Q3 2023", "Q3 2025"));
  });

  it("gives each state a mark besides its colour", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} hideLegend />);
    const glyphs = new Map<string, string>();
    for (const el of document.querySelectorAll<HTMLElement>("td[data-state]")) glyphs.set(el.dataset["state"]!, (el.textContent ?? "").trim().charAt(0));
    expect(new Set(glyphs.values()).size).toBe(glyphs.size);
    expect([...glyphs.keys()].sort()).toEqual(["CRAWLED_PROVISIONAL", "KNOWN_GAP", "LOADED", "NOT_IN_SOURCE", "NOT_YET_LOADED", "POSSIBLY_INCOMPLETE"]);
  });

  it("reads in Romanian, with the plural rules", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="ro" copy={sampleCopy.coverageGrid("ro")} />);
    expect(cellOf("2024-Q4", "CONTRACT", "ro")).toHaveAccessibleName(/^Contracte, T4 2024: Posibil incomplet\. 6\.900 de înregistrări\. Mai puțin de 60% din mediana/);
    expect(cellOf("2021-Q1", "AWARD_NOTICE", "ro")).toHaveAccessibleName(/Nu se vede în sursă/);
  });

  it("falls back to the raw kind when the copy has no label for it, and shows a missing cell as no information", () => {
    const cells = [...fixturePageContent("typical-every-gap-state").cells, { quarter: "2024-Q4", kind: "NEW_KIND", state: "LOADED" as const, rule: null, note: null, records: 3, crawlOnly: 0, dataThrough: null }];
    render(<CoverageGrid cells={cells} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(screen.getByRole("rowheader", { name: "NEW_KIND" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: /no information/ }).length).toBeGreaterThan(0);
  });

  it("lists quarters chronologically from 2021-Q1 and the kinds as rows", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    const headers = names(screen.getAllByRole("columnheader").slice(1));
    expect(headers[0]).toBe("Q1 2021");
    expect(headers.at(-1)).toBe("Q3 2025");
    expect(headers).toHaveLength(19);
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual(["Direct purchases", "Direct purchase award notifications", "Contracts", "Award notices"]);
  });

  it("has a legend with all six states", () => {
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    const legend = screen.getByRole("region", { name: "Cell states" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(6);
  });
});

describe("the date range", () => {
  const marked = (dateWindow?: { from?: string | null; to?: string | null }) => {
    const { unmount } = render(<CoverageGrid cells={cellsBetween(sampleGrid(), "2021-Q1", "2022-Q4")} locale="en" copy={sampleCopy.coverageGrid("en")} {...(dateWindow ? { dateWindow } : {})} />);
    const result = screen.getAllByRole("columnheader").filter((h) => h.getAttribute("aria-current") === "true").map((h) => h.dataset["quarter"]);
    const cellsMarked = document.querySelectorAll("td[data-in-range]").length;
    unmount();
    return { result, cellsMarked };
  };

  it("marks the columns that overlap a closed range, headers and cells", () => {
    const { result, cellsMarked } = marked({ from: "2021-05-01", to: "2022-02-01" });
    expect(result).toEqual(["2021-Q2", "2021-Q3", "2021-Q4", "2022-Q1"]);
    expect(cellsMarked).toBe(4 * 4);
  });

  it("marks from the first quarter for an open start, and to the last for an open end", () => {
    expect(marked({ from: null, to: "2021-07-01" }).result).toEqual(["2021-Q1", "2021-Q2", "2021-Q3"]);
    expect(marked({ from: "2022-04-10" }).result).toEqual(["2022-Q2", "2022-Q3", "2022-Q4"]);
  });

  it("marks nothing without a window or with both ends open, and the legend has no range swatch", () => {
    expect(marked().result).toEqual([]);
    expect(marked({ from: null, to: null }).cellsMarked).toBe(0);
    render(<CoverageGrid cells={sampleGrid()} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(screen.queryByText("Inside the date range")).toBeNull();
  });

  it("says in a cell's accessible name that it is in the range, and the legend explains the mark", () => {
    render(<CoverageGrid cells={sampleGrid()} dateWindow={{ from: "2023-01-01", to: "2023-12-31" }} locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(cellOf("2023-Q2", "DA")).toHaveAccessibleName(/inside the date range$/);
    expect(cellOf("2024-Q2", "DA")).not.toHaveAccessibleName(/inside the date range/);
    expect(screen.getByText("Inside the date range")).toBeVisible();
  });
});
