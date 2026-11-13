import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { HAND_ENTERED_NOTE, fixturePageContent, samplePageContent } from "../../samples/coverageGrid.ts";
import { CoveragePageLayout, type CoveragePageContent } from "./index.ts";

function show(content: CoveragePageContent | undefined, status: "loading" | "error" | "ready" = "ready", locale: "en" | "ro" = "en") {
  render(<CoveragePageLayout status={status} content={content} locale={locale} methodologyHref="/explore/methodology" lensHref="/explore/?lens=coverage" copy={sampleCopy.coveragePageLayout(locale)} />);
}
const section = (name: string) => within(screen.getByRole("region", { name }));

describe("the Coverage page", () => {
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
      "Direct purchases: data through 30 June 2025",
      "Direct purchase award notifications: data through 31 March 2025",
      "Contracts: data through 19 September 2025",
      "Award notices: data through 19 September 2025",
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

  it("shows an error as an alert", () => {
    show(undefined, "error");
    expect(screen.getByRole("alert")).toHaveTextContent("Coverage could not be loaded");
  });

  it("reads in Romanian", () => {
    show(samplePageContent(), "ready", "ro");
    expect(screen.getByRole("heading", { level: 1, name: "Acoperire" })).toBeVisible();
    expect(screen.getByText("Lista entităților publice a Ministerului Finanțelor: versiunea din 14 august 2025")).toBeVisible();
    expect(section("Înregistrări absente din datele în masă").getByText("Contracte, T3 2025: 140 de înregistrări absente din datele în masă")).toBeVisible();
  });
});
