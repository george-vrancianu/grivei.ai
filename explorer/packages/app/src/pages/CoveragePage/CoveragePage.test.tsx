// Seam 3 for the Coverage page: the app at both URLs, answering from the contract's CoveragePage fixtures through the injected fetch.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { coverageVariables } from "./coveragePage.utils.ts";

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
  it("shows the title, the grid, data-through per kind and the MF snapshot date for the date chip's window", async () => {
    const sent = open(`${path}?from=2021-01-01&to=2024-12-31`);
    const grid = within(await screen.findByRole("region", { name: gridHeading }));
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(grid.getAllByRole("cell").length).toBeGreaterThan(0);
    // the date chip's window is what the grid highlights
    expect(document.querySelectorAll("th[aria-current='true']").length).toBe(16);
    const items = screen.getAllByRole("listitem").map((li) => (li.textContent ?? "").replace(/\s/g, " "));
    expect(items).toContain(contractThrough);
    expect(screen.getByText(snapshot)).toBeVisible();
    expect(sent.map((s) => [s.operation, s.variables])).toEqual([["CoveragePage", { window: { from: "2021-01-01", to: "2024-12-31" } }]]);
  });

  it("asks with no window when there is no date chip, and highlights nothing", async () => {
    const sent = open(path);
    expect(await screen.findByRole("region", { name: gridHeading })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(document.querySelectorAll("th[aria-current='true']").length).toBe(0);
    expect(sent.map((s) => s.variables)).toEqual([{}]);
  });
});

describe("the Coverage page's states", () => {
  it("shows an empty window as a sentence", async () => {
    open("/explore/coverage?from=2019-01-01&to=2019-12-31");
    expect(await screen.findByText("No quarter of SEAP falls in this date range.")).toBeVisible();
    expect(screen.getByText("The Ministry of Finance list of public entities is not loaded yet.")).toBeVisible();
  });

  it("shows an alert when the answer cannot be loaded (no fixture for this window)", async () => {
    open("/explore/coverage?from=2001-01-01");
    expect(await screen.findByRole("alert")).toHaveTextContent("Coverage could not be loaded");
  });

  it("links the rules to the methodology page in the page's language", async () => {
    open("/ro/explore/coverage?from=2021-01-01&to=2024-12-31");
    expect(await screen.findByRole("link", { name: "Cum se numără cifrele" })).toHaveAttribute("href", "/ro/explore/methodology");
  });
});

describe("coverageVariables", () => {
  it("sends only the ends the date chip has", () => {
    expect(coverageVariables({})).toEqual({});
    expect(coverageVariables({ from: "2023-01-01" })).toEqual({ window: { from: "2023-01-01" } });
    expect(coverageVariables({ to: "2023-12-31" })).toEqual({ window: { to: "2023-12-31" } });
  });
});
