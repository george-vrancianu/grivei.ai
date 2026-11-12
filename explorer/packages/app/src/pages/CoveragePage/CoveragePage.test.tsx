// Seam 3 for the Coverage page: the app at both URLs, answering from the contract's CoveragePage fixtures through the injected fetch.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
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
  ["en", "/explore/coverage", "Coverage", "Quarter by record kind", "Contracts: data through 30 September 2024", "Ministry of Finance list of public entities: snapshot of 15 September 2024"],
  ["ro", "/ro/explore/coverage", "Acoperire", "Trimestre și tipuri de înregistrare", "Contracte: date până la 30 septembrie 2024", "Lista entităților publice a Ministerului Finanțelor: versiunea din 15 septembrie 2024"],
] as const)("the Coverage page in %s", (_locale, path, title, gridHeading, contractThrough, snapshot) => {
  const marked = () => [...document.querySelectorAll<HTMLElement>("th[aria-current='true']")].map((th) => th.dataset["quarter"]);

  it("shows the title, the whole grid, data-through per record kind and the MF snapshot date, asking for the whole grid", async () => {
    const sent = open(path);
    const grid = within(await screen.findByRole("region", { name: gridHeading }));
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(grid.getAllByRole("cell").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("th[data-quarter]")).toHaveLength(16);
    const items = screen.getAllByRole("listitem").map((li) => (li.textContent ?? "").replace(/\s/g, " "));
    expect(items).toContain(contractThrough);
    expect(screen.getByText(snapshot)).toBeVisible();
    expect(sent.map((s) => [s.operation, s.variables])).toEqual([["CoveragePage", {}]]);
  });

  it("highlights only the quarters of the date chip's window, against the whole grid", async () => {
    const sent = open(`${path}?from=2023-01-01&to=2023-12-31`);
    await screen.findByRole("region", { name: gridHeading });
    expect(document.querySelectorAll("th[data-quarter]")).toHaveLength(16);
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
