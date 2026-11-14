// Seam 3 for the Source picker beside the search bar (#178): the SEAP screen's own count, ONRC's count for the query text, side by side and never summed; and every SEAP link from before the picker unchanged.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { ONRC_TYPICAL_COUNT, onrcCountFor, onrcWholeCoverage } from "../../testing/sourceFixtures.ts";

afterEach(() => openAt("/"));

function open(url: string) {
  openAt(url);
  const fixture = fixtureClient({ extra: [onrcCountFor("comuna"), onrcWholeCoverage] });
  render(<App client={fixture.client} loadCountyTopology={loadTestCountyTopology} />);
  return fixture;
}
const here = () => `${window.location.pathname}${window.location.search}`;

describe.each([
  { base: "/explore/", c: catalogue.en },
  { base: "/ro/explore/", c: catalogue.ro },
] as const)("the Source picker at $base", ({ base, c }) => {
  const s = c.sources;
  const picker = () => within(screen.getByRole("group", { name: s.picker.label }));

  it("sits beside the search bar with SEAP chosen, SEAP's own count and ONRC's count for the query, in each Source's own unit", async () => {
    const { sent } = open(`${base}?q=comuna`);
    await screen.findByTestId("main-total");
    expect(picker().getByRole("button", { name: `SEAP · ${s.counts.SEAP(8, "8")}`, pressed: true })).toBeVisible();
    await waitFor(() => expect(picker().getByRole("button", { name: `ONRC · ${s.counts.ONRC(ONRC_TYPICAL_COUNT, String(ONRC_TYPICAL_COUNT))}`, pressed: false })).toBeVisible());
    // SEAP's count is the screen's own: SEAP is asked once, for the screen; ONRC once, for the picker
    expect(sent.map((r) => r.operation).sort()).toEqual(["MainScreen", "OnrcSearch"]);
    // the two counts are never one figure: no sum on the page, and the results stay SEAP's
    expect(screen.getByRole("tab", { name: new RegExp(c.results.tabs.suppliers) })).toBeVisible();
  });

  it("shows only the Sources' names, and asks ONRC for nothing, while there is no query", async () => {
    const { sent } = open(base);
    await screen.findByTestId("main-total");
    expect(picker().getByRole("button", { name: "SEAP", pressed: true })).toBeVisible();
    expect(picker().getByRole("button", { name: "ONRC", pressed: false })).toBeVisible();
    expect(sent.map((r) => r.operation)).toEqual(["MainScreen"]);
  });

  it("keeps SEAP's own count of the filter the reader sees, chips included, and ONRC's of the query text alone", async () => {
    open(`${base}?q=comuna&channel=direct-purchase`);
    await screen.findByTestId("main-total");
    expect(picker().getByRole("button", { name: `SEAP · ${s.counts.SEAP(6, "6")}`, pressed: true })).toBeVisible();
    await waitFor(() => expect(picker().getByRole("button", { name: /^ONRC · / })).toBeVisible());
  });

  it("goes to ONRC with the query text only, the chips left behind, and the Source in the URL", async () => {
    open(`${base}?q=comuna&channel=direct-purchase`);
    await screen.findByTestId("main-total");
    await userEvent.click(picker().getByRole("button", { name: /^ONRC/ }));
    expect(here()).toBe(`${base}?q=comuna&source=onrc`);
    expect(await screen.findByRole("heading", { level: 1, name: s.onrc.title })).toBeVisible();
    expect(picker().getByRole("button", { name: /^ONRC/, pressed: true })).toBeVisible();
  });

  it("opens every SEAP URL from before the picker unchanged: the same filter, the same URL, no Source added when the reader types", async () => {
    const url = `${base}?q=comuna&county=RO-BV&tab=suppliers`;
    const { sent } = open(url);
    await screen.findByRole("searchbox", { name: c.searchBar.label });
    expect(here()).toBe(url);
    await waitFor(() => expect(sent.some((r) => r.operation === "MainScreen")).toBe(true));
    expect(sent.find((r) => r.operation === "MainScreen")?.variables).toEqual({ filter: { q: "comuna", county: "RO-BV" } });
    await userEvent.click(screen.getByRole("tab", { name: new RegExp(c.results.tabs.records) }));
    await waitFor(() => expect(window.location.search).toBe("?q=comuna&county=RO-BV&tab=records"));
  });

  it("reads source=seap as the default SEAP screen", async () => {
    open(`${base}?source=seap`);
    expect(await screen.findByTestId("main-total")).toBeVisible();
    expect(picker().getByRole("button", { name: "SEAP", pressed: true })).toBeVisible();
  });

  it("puts the Source selector on the Coverage lens, SEAP chosen, and shows ONRC's snapshots when ONRC is chosen there, keeping the lens", async () => {
    open(`${base}?lens=coverage`);
    const selector = within(await screen.findByRole("group", { name: s.coverageSwitch.label }));
    expect(selector.getByRole("button", { name: "SEAP", pressed: true })).toBeVisible();
    await userEvent.click(selector.getByRole("button", { name: "ONRC" }));
    expect(here()).toBe(`${base}?lens=coverage&source=onrc`);
    expect(await screen.findByRole("table", { name: s.onrc.coverage.snapshots.label })).toBeVisible();
    expect(within(screen.getByRole("group", { name: s.coverageSwitch.label })).getByRole("button", { name: "ONRC", pressed: true })).toBeVisible();
  });
});
