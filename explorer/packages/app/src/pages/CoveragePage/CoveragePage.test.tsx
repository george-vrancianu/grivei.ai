// Seam 3 for the Coverage page: the app at both URLs, answering from the contract's recorded CoveragePage answer (seam 1, #90) through the injected fetch.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { createClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { highlightWindow } from "./coveragePage.utils.ts";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}

describe.each([
  ["en", "/explore/coverage", "Coverage", "Quarter by record kind", "Contracts: data through 2 July 2025", "Ministry of Finance list of public entities: snapshot of 1 November 2026"],
  ["ro", "/ro/explore/coverage", "Acoperire", "Trimestre și tipuri de înregistrare", "Contracte: date până la 2 iulie 2025", "Lista entităților publice a Ministerului Finanțelor: versiunea din 1 noiembrie 2026"],
] as const)("the Coverage page in %s", (_locale, path, title, gridHeading, contractThrough, snapshot) => {
  const marked = () => [...document.querySelectorAll<HTMLElement>("th[aria-current='true']")].map((th) => th.dataset["quarter"]);

  it("shows the title, the whole grid, data-through per record kind and the MF snapshot date, asking for the whole grid", async () => {
    const sent = open(path);
    const grid = within(await screen.findByRole("region", { name: gridHeading }));
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(grid.getAllByRole("cell").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("th[data-quarter]")).toHaveLength(19);
    const items = screen.getAllByRole("listitem").map((li) => (li.textContent ?? "").replace(/\s/g, " "));
    expect(items).toContain(contractThrough);
    expect(screen.getByText(snapshot)).toBeVisible();
    expect(sent.map((s) => [s.operation, s.variables])).toEqual([["CoveragePage", {}]]);
  });

  it("leaves no cell's state to colour alone: a glyph and an accessible name on every cell, stripes on a known gap, and the grid scrolls in its own box", async () => {
    open(path);
    const grid = await screen.findByRole("region", { name: gridHeading });
    const cells = [...grid.querySelectorAll<HTMLElement>("td[data-state]")];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect((cell.textContent ?? "").trim(), cell.getAttribute("aria-label") ?? "").not.toBe("");
      expect(cell.getAttribute("aria-label") ?? "").not.toBe("");
    }
    const known = cells.find((c) => c.dataset["state"] === "KNOWN_GAP");
    if (known) expect(getComputedStyle(known).backgroundImage).toContain("repeating-linear-gradient");
    expect(getComputedStyle(within(grid).getByRole("region", { name: catalogue[_locale].coverage.grid.label })).overflowX).toBe("auto");
  });

  it("has the N of M block with a link to the Coverage lens, and the lead paragraph", async () => {
    open(path);
    await screen.findByRole("region", { name: gridHeading });
    const block = within(screen.getByRole("region", { name: catalogue[_locale].coverage.perCounty.heading }));
    expect(block.getByRole("link", { name: catalogue[_locale].coverage.perCounty.lensLink })).toHaveAttribute("href", `${path.replace("coverage", "")}?lens=coverage`);
    expect(screen.getByText(catalogue[_locale].coverage.intro)).toBeVisible();
  });

  it("highlights only the quarters of the date chip's window, against the whole grid", async () => {
    const sent = open(`${path}?from=2023-01-01&to=2023-12-31`);
    await screen.findByRole("region", { name: gridHeading });
    expect(document.querySelectorAll("th[data-quarter]")).toHaveLength(19);
    expect(marked()).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
    const outside = document.querySelector("th[data-quarter='2022-Q4']");
    expect(outside).not.toHaveAttribute("aria-current");
    expect(outside).not.toHaveAttribute("data-in-range");
    // the window is never sent: the API would cut the grid to it, and every column would read as highlighted
    expect(sent.map((s) => s.variables)).toEqual([{}]);
  });

  it("highlights nothing when there is no date chip", async () => {
    open(path);
    await screen.findByRole("region", { name: gridHeading });
    expect(marked()).toEqual([]);
  });
});

describe("the Coverage page's states", () => {
  it("shows an alert when the answer cannot be loaded", async () => {
    openAt("/explore/coverage");
    render(<App client={createClient({ fetch: async () => Response.json({ errors: [{ message: "down" }] }, { status: 500 }) })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Coverage could not be loaded");
  });

  it("links the rules to the methodology page in the page's language", async () => {
    open("/ro/explore/coverage");
    expect(await screen.findByRole("link", { name: "Cum se numără cifrele" })).toHaveAttribute("href", "/ro/explore/methodology#coverage-statuses");
  });
});

describe("highlightWindow", () => {
  it("is the date chip's window, with open ends as null, and nothing without a date chip", () => {
    expect(highlightWindow({})).toBeNull();
    expect(highlightWindow({ from: "2023-01-01" })).toEqual({ from: "2023-01-01", to: null });
    expect(highlightWindow({ to: "2023-12-31" })).toEqual({ from: null, to: "2023-12-31" });
  });
});

// #90: everything the page shows comes from the API's recorded answer (`recorded/CoveragePage.json`, case "whole-grid"), in both languages.
describe.each([
  {
    locale: "en", path: "/explore/coverage",
    through: ["Award notices: data through 2 July 2025", "Contracts: data through 2 July 2025", "Direct purchases: data through 24 March 2023"],
    crawlOnly: ["Award notices, Q2 2021: 2 Records not in bulk data", "Award notices, Q3 2021: 1 Record not in bulk data", "Contracts, Q2 2025: 1 Record not in bulk data"],
    gaps: [
      ["Q1 2023", "Direct purchase award notifications", "Known gap", "Fisier lipsa la sursa (fixture); raportat", "0"],
      ["Q4 2024", "Contracts", "Possibly incomplete", "", "9"],
      ["Q2 2025", "Direct purchase award notifications", "Known gap", "Fișier încărcat greșit (fixture), conținutul nu corespunde trimestrului; raportat la sursă, trimestrul rămâne gol", "0"],
    ],
  },
  {
    locale: "ro", path: "/ro/explore/coverage",
    through: ["Anunțuri de atribuire: date până la 2 iulie 2025", "Contracte: date până la 2 iulie 2025", "Achiziții directe: date până la 24 martie 2023"],
    crawlOnly: [
      "Anunțuri de atribuire, T2 2021: 2 înregistrări absente din datele în masă",
      "Anunțuri de atribuire, T3 2021: 1 înregistrare absentă din datele în masă",
      "Contracte, T2 2025: 1 înregistrare absentă din datele în masă",
    ],
    gaps: [
      ["T1 2023", "Notificări de atribuire a cumpărării directe", "Lacună cunoscută", "Fisier lipsa la sursa (fixture); raportat", "0"],
      ["T4 2024", "Contracte", "Posibil incomplet", "", "9"],
      ["T2 2025", "Notificări de atribuire a cumpărării directe", "Lacună cunoscută", "Fișier încărcat greșit (fixture), conținutul nu corespunde trimestrului; raportat la sursă, trimestrul rămâne gol", "0"],
    ],
  },
] as const)("the Coverage page's content from the API in $locale", (c) => {
  const t = catalogue[c.locale];

  it("lists the data-through date of every record kind SEAP has data for, and no planned Source", async () => {
    open(c.path);
    await screen.findByRole("region", { name: t.coverage.gridHeading });
    const list = screen.getByRole("list", { name: "SEAP" });
    expect(within(list).getAllByRole("listitem").map((li) => (li.textContent ?? "").replace(/\s/g, " "))).toEqual(c.through);
    expect(screen.queryByRole("list", { name: "ONRC" })).toBeNull(); // planned Sources are served, but have nothing to show
  });

  it("lists the known gaps and the possibly incomplete cell with the note or the rule, verbatim from the source's data", async () => {
    open(c.path);
    const table = within(await screen.findByRole("table", { name: t.coverage.knownGaps.heading }));
    const all = table.getAllByRole("row").slice(1);
    const rowsOf = (state: string) => all.filter((row) => row.getAttribute("data-state") === state).map((row) => within(row).getAllByRole("cell").map((cell) => (cell.textContent ?? "").replace(/\s/g, " ")));
    expect(all).toHaveLength(12); // 4 known gaps, 1 possibly incomplete, 7 award-notice quarters not visible in the source; no NOT_YET_LOADED row
    expect(rowsOf("NOT_IN_SOURCE")).toHaveLength(7);
    const expected = c.gaps.map(([q, k, s, r, n]) => [q, k, s, r === "" ? t.coverage.grid.rules.COUNT_BELOW_NEIGHBOURS : r, n]);
    expect(rowsOf("KNOWN_GAP").length + rowsOf("POSSIBLY_INCOMPLETE").length).toBe(5);
    for (const row of expected) expect([...rowsOf("KNOWN_GAP"), ...rowsOf("POSSIBLY_INCOMPLETE")]).toContainEqual(row);
  });

  it("names a not-yet-loaded cell in the grid, with and without the awaiting-bulk-file rule", async () => {
    open(c.path);
    await screen.findByRole("region", { name: t.coverage.gridHeading });
    const named = (quarter: string, kind: string) => {
      const header = document.querySelector(`th[data-quarter='${quarter}']`)!;
      const column = [...header.parentElement!.children].indexOf(header);
      const row = [...document.querySelectorAll("tbody tr")].find((tr) => within(tr as HTMLElement).queryByText(t.coverage.grid.kinds[kind as "DA"]!) !== null)!;
      return row.children[column]!.getAttribute("aria-label") ?? row.children[column]!.textContent ?? "";
    };
    // 2022 Q2 DA: the quarantined file, no rule; 2022 Q3 DA: the quarter's file is not out yet, AWAITING_BULK_FILE. Both read as not yet loaded in the grid.
    for (const cell of [named("2022-Q2", "DA"), named("2022-Q3", "DA")]) {
      expect(cell).toContain(t.coverage.grid.states.NOT_YET_LOADED);
      expect(cell).toContain(t.coverage.grid.notYetLoaded);
    }
    expect(t.coverage.grid.rules.AWAITING_BULK_FILE).not.toBe("");
  });

  it("lists the crawl-only Records per quarter and record kind, from the API's counts (#60/#90)", async () => {
    open(c.path);
    await screen.findByRole("region", { name: t.coverage.gridHeading });
    const section = screen.getByRole("region", { name: t.coverage.crawlOnly.heading });
    expect(within(section).getAllByRole("listitem").map((li) => (li.textContent ?? "").replace(/\s/g, " "))).toEqual(c.crawlOnly);
  });
});
