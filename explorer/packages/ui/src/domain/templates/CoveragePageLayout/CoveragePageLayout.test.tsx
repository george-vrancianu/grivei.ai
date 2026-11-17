import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { HAND_ENTERED_NOTE, fixturePageContent, samplePageContent } from "../../samples/coverageGrid.ts";
import { CoveragePageLayout, type CoveragePageContent } from "./index.ts";

function show(content: CoveragePageContent | undefined, status: "loading" | "error" | "ready" = "ready", locale: "en" | "ro" = "en") {
  render(<CoveragePageLayout status={status} content={content} locale={locale} methodologyHref="/explore/methodology" lensHref="/explore/?lens=coverage" copy={sampleCopy.coveragePageLayout(locale)} />);
}
const section = (name: string) => within(screen.getByRole("region", { name }));

describe("the Coverage page", () => {
  it("shows the Source selector slot under the intro in every state, and nothing without one", () => {
    const { rerender } = render(<CoveragePageLayout status="loading" locale="en" methodologyHref="/m" lensHref="/l" sourceSelector={<p>selector</p>} copy={sampleCopy.coveragePageLayout("en")} />);
    expect(screen.getByText("selector")).toBeVisible();
    rerender(<CoveragePageLayout status="ready" content={samplePageContent()} locale="en" methodologyHref="/m" lensHref="/l" sourceSelector={<p>selector</p>} copy={sampleCopy.coveragePageLayout("en")} />);
    expect(screen.getByText("selector")).toBeVisible();
    rerender(<CoveragePageLayout status="ready" content={samplePageContent()} locale="en" methodologyHref="/m" lensHref="/l" copy={sampleCopy.coveragePageLayout("en")} />);
    expect(screen.queryByText("selector")).toBeNull();
  });

  it("lists each known gap with its reason: the note verbatim, or the rule in words, and its Record count", () => {
    show(samplePageContent());
    const list = section("Known gaps");
    const rows = list.getAllByRole("row").slice(1);
    const text = (row: HTMLElement) => (row.textContent ?? "").replace(/\s+/g, " ");
    const handEntered = rows.find((r) => text(r).includes("Q2 2025"))!;
    expect(within(handEntered).getByText(HAND_ENTERED_NOTE)).toBeVisible();
    expect(text(handEntered)).toContain("Known gap");
    const incomplete = rows.find((r) => text(r).includes("Q4 2024") && text(r).includes("Contracts"))!;
    expect(text(incomplete)).toContain("Fewer than 60% of the median row count of the surrounding quarters");
    expect(text(incomplete)).toContain("6,900");
    expect(rows.find((r) => text(r).includes("Q1 2021") && text(r).includes("Award notices"))).toBeDefined();
  });

  it("words the N of M block with the Source's name and the grid's first year, not fixed text", () => {
    const content = samplePageContent();
    const sources = content.sources.map((s) => (s.id === "SEAP" ? { ...s, name: "SEAP-X" } : s));
    const cells = content.cells.filter((c) => !c.quarter.startsWith("2021"));
    show({ ...content, sources, cells });
    const note = section("per county: N of M");
    expect(note.getByText(/have SEAP-X records since 2022,/)).toBeVisible();
  });

  it("lists no Not yet loaded cell, whatever its rule: a quarantined file cannot be told from a file not published yet", () => {
    show(samplePageContent());
    const rows = section("Known gaps").getAllByRole("row").map((r) => r.textContent ?? "");
    expect(rows.some((r) => r.includes("Q3 2023"))).toBe(false);
    expect(rows.some((r) => r.includes("Not yet loaded") || r.includes("Awaiting"))).toBe(false);
  });

  it("states every rule in words, the possibly-incomplete rule as published, and links to the methodology", () => {
    show(samplePageContent());
    const rules = section("How gaps are decided");
    expect(rules.getByText("Fewer than 60% of the median row count of the surrounding quarters")).toBeVisible();
    expect(rules.getByText(/^Contracts awarded without a prior call are in no bulk file/)).toBeVisible();
    expect(rules.getByText(/^Awaiting bulk file: the quarter's bulk file/)).toBeVisible();
    expect(rules.getByText(/^Entered by hand in the gap file/)).toBeVisible();
    expect(rules.getByRole("link", { name: "How the numbers are counted" })).toHaveAttribute("href", "/explore/methodology");
  });

  it("highlights only the quarters of the window, against the whole grid", () => {
    show(samplePageContent({ from: "2023-01-01", to: "2023-12-31" }));
    const headers = [...document.querySelectorAll<HTMLElement>("th[data-quarter]")];
    expect(headers).toHaveLength(19);
    const marked = headers.filter((h) => h.getAttribute("aria-current") === "true").map((h) => h.dataset["quarter"]);
    expect(marked).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
    expect(headers.find((h) => h.dataset["quarter"] === "2022-Q4")).not.toHaveAttribute("data-in-range");
    expect(headers.find((h) => h.dataset["quarter"] === "2024-Q1")).not.toHaveAttribute("data-in-range");
  });

  it("highlights nothing without a window", () => {
    show({ ...samplePageContent(), dateWindow: null });
    expect(document.querySelectorAll("th[aria-current='true']")).toHaveLength(0);
  });

  it("says that the e-licitatie backfill covers the 2021-22 award notices as loaded", () => {
    show(samplePageContent());
    expect(section("How gaps are decided").getByText(/e-licitatie backfill has run, the 2021-22 award notices are covered via e-licitatie and show as loaded/)).toBeVisible();
  });

  it("shows the data-through date per record kind", () => {
    show(samplePageContent());
    const through = section("Data through");
    const items = through.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "Direct purchases data through 30 June 2025",
      "Direct purchase award notifications data through 31 March 2025",
      "Contracts data through 19 September 2025",
      "Award notices data through 19 September 2025",
    ]);
  });

  it("shows the counts of Records not in bulk data when the cells carry them, and leaves the section out otherwise", () => {
    show(samplePageContent());
    expect(section("Records not in bulk data").getByText("Contracts, Q3 2025: 140 Records not in bulk data")).toBeVisible();
  });

  it("leaves the crawl-only section out when no cell has crawl-only Records", () => {
    show(fixturePageContent("extreme-full-grid"));
    expect(screen.queryByRole("region", { name: "Records not in bulk data" })).toBeNull();
  });

  it("lists the contract's crawl-only counts (#60/#90)", () => {
    show(fixturePageContent("typical-every-gap-state"));
    expect(section("Records not in bulk data").getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Contracts, Q3 2024: 120 Records not in bulk data"]);
  });

  it("shows the reference snapshot date, or says it is not loaded yet", () => {
    show(samplePageContent());
    expect(screen.getByText("Ministry of Finance list of public entities: snapshot of 14 August 2025")).toBeVisible();
  });

  it("handles a missing snapshot", () => {
    show({ ...samplePageContent(), referenceSnapshot: null });
    expect(screen.getByText("The Ministry of Finance list of public entities is not loaded yet.")).toBeVisible();
  });

  it("says so when no quarter is loaded yet", () => {
    show(fixturePageContent("empty-window"));
    expect(screen.getByText("No quarter of SEAP is loaded yet.")).toBeVisible();
    expect(screen.queryByRole("table", { name: "Coverage by quarter and record kind" })).toBeNull();
    expect(screen.getByText("No known gaps in the data shown.")).toBeVisible();
  });

  it("shows loading and error states with the title", () => {
    show(undefined, "loading");
    expect(screen.getByRole("heading", { level: 1, name: "Coverage" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading coverage");
  });

  it("shows an error as an alert inside the grid panel, with its retry, and leaves the rules and the selector", async () => {
    const onRetry = vi.fn();
    render(<CoveragePageLayout status="error" locale="en" methodologyHref="/m" lensHref="/l" sourceSelector={<p>selector</p>} retry={{ label: "Try again", onRetry }} copy={sampleCopy.coveragePageLayout("en")} />);
    const grid = section("Quarter by record kind");
    expect(grid.getByRole("alert")).toHaveTextContent("Coverage could not be loaded");
    expect(grid.getByText("selector")).toBeVisible();
    await userEvent.click(grid.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: "How gaps are decided" })).toBeVisible();
    for (const name of ["Known gaps", "Data through", "Public entities list", "per county: N of M"]) expect(screen.queryByRole("region", { name })).toBeNull();
  });

  it("shows the first load as skeletons under real titles, with one loading status in the grid panel's header and the rules in full", () => {
    show(undefined, "loading");
    for (const name of ["Quarter by record kind", "Known gaps", "Data through", "How gaps are decided", "Public entities list", "per county: N of M"]) expect(screen.getByRole("region", { name })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Records not in bulk data" })).toBeNull();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(section("Quarter by record kind").getByRole("status")).toHaveTextContent("Loading coverage");
    expect(section("How gaps are decided").getByRole("link", { name: "How the numbers are counted" })).toBeVisible();
    expect(document.querySelectorAll("[aria-busy='true']")).toHaveLength(0);
  });

  it("keeps the last answer when busy: every data panel's body dims with aria-busy, the header strips stay, and the loading status shows beside the selector", () => {
    render(<CoveragePageLayout status="ready" content={samplePageContent()} busy locale="en" methodologyHref="/m" lensHref="/l" sourceSelector={<p>selector</p>} copy={sampleCopy.coveragePageLayout("en")} />);
    const busy = screen.getAllByRole("region").filter((r) => r.querySelector("[aria-busy='true']") !== null);
    expect(busy.map((r) => r.getAttribute("aria-label"))).toEqual(["Quarter by record kind", "Known gaps", "Records not in bulk data", "Data through", "Public entities list", "per county: N of M"]);
    expect(section("Quarter by record kind").getByRole("status")).toHaveTextContent("Loading coverage");
    expect(section("Quarter by record kind").getByText("selector")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Known gaps" })).toBeVisible();
    expect(screen.getByRole("region", { name: "How gaps are decided" }).querySelector("[aria-busy='true']")).toBeNull();
  });

  it("is not busy and has no loading status once the answer is current", () => {
    show(samplePageContent());
    expect(document.querySelectorAll("[aria-busy='true']")).toHaveLength(0);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("puts the grid in a titled panel: the selector in its header, the grid in one sideways-scrolling box, the legend and the window note as its foot", () => {
    render(<CoveragePageLayout status="ready" content={samplePageContent({ from: "2023-01-01", to: "2023-12-31" })} locale="en" methodologyHref="/m" lensHref="/l" sourceSelector={<p>selector</p>} copy={sampleCopy.coveragePageLayout("en")} />);
    const grid = section("Quarter by record kind");
    expect(screen.getByRole("heading", { level: 2, name: "Quarter by record kind" })).toBeVisible();
    expect(grid.getByText("selector")).toBeVisible();
    expect(grid.getByRole("region", { name: "Coverage by quarter and record kind" })).toBeVisible();
    expect(grid.getAllByRole("region")).toHaveLength(2); // the grid's scroll box and the legend: no second scroll box
    expect(grid.getByRole("region", { name: "Cell states" })).toBeVisible();
    expect(grid.getByText(/quarters follow the publication date/)).toBeVisible();
    expect(grid.getByText("Inside the date range")).toBeVisible(); // the range swatch, as there is a window
  });

  it("counts the rows of the Known gaps table in the panel header, also when there are none", () => {
    const { unmount } = render(<CoveragePageLayout status="ready" content={samplePageContent()} locale="en" methodologyHref="/m" lensHref="/l" copy={sampleCopy.coveragePageLayout("en")} />);
    const rows = section("Known gaps").getAllByRole("row").length - 1;
    expect(screen.getByText(`${rows} cells`)).toBeVisible();
    unmount();
    show({ ...samplePageContent(), cells: samplePageContent().cells.filter((c) => c.state === "LOADED") });
    expect(screen.getByText("0 cells")).toBeVisible();
    expect(screen.getByText("No known gaps in the data shown.")).toBeVisible();
  });

  it("shows each state's cell colour beside its name in the Known gaps rows, without a glyph", () => {
    show(samplePageContent());
    const rows = section("Known gaps").getAllByRole("row").slice(1);
    for (const row of rows) {
      const swatch = row.querySelector<HTMLElement>("[aria-hidden='true']")!;
      expect(swatch).toBeInTheDocument();
      expect(swatch.textContent).toBe("");
    }
    expect(section("Known gaps").getByRole("region", { name: "Known gaps by quarter and record kind" })).toBeVisible();
  });

  it("shows one inset figure per record kind in Data through: the kind as its label", () => {
    show(samplePageContent());
    const item = within(section("Data through").getByRole("list", { name: "SEAP" })).getAllByRole("listitem")[0]!;
    expect(within(item).getByText("Direct purchases")).toBeVisible();
    expect(item).toHaveTextContent("Direct purchases data through 30 June 2025");
  });

  it("reads in Romanian", () => {
    show(samplePageContent(), "ready", "ro");
    expect(screen.getByRole("heading", { level: 1, name: "Acoperire" })).toBeVisible();
    expect(screen.getByText("Lista entităților publice a Ministerului Finanțelor: versiunea din 14 august 2025")).toBeVisible();
    expect(section("Înregistrări absente din datele în masă").getByText("Contracte, T3 2025: 140 de înregistrări absente din datele în masă")).toBeVisible();
    const rows = section("Lacune cunoscute").getAllByRole("row").length - 1;
    expect(screen.getByText(new RegExp(`^${rows} (de )?celule$`))).toBeVisible();
  });

  it("counts cells in Romanian with the plural rule", () => {
    const { knownGaps } = sampleCopy.coveragePageLayout("ro");
    expect([1, 7, 20, 21, 120].map(knownGaps.count)).toEqual(["1 celulă", "7 celule", "20 de celule", "21 de celule", "120 de celule"]);
    expect(sampleCopy.coveragePageLayout("en").knownGaps.count(1)).toBe("1 cell");
  });
});
