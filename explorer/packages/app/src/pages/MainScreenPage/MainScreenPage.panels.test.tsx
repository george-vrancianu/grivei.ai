// The main screen's panels: the title above them, search and filters together, the Total, the map and the results.
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const panel = (el: Element) => el.closest(".MuiCard-root");

describe.each([
  { locale: "en", url: "/explore/?q=contract" },
  { locale: "ro", url: "/ro/explore/?q=contract" },
] as const)("the main screen's panels at $url", ({ locale, url }) => {
  const t = catalogue[locale];

  it("puts the title above the panels, with search and filters in one panel and the Total in another", async () => {
    openAt(url);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const title = await screen.findByRole("heading", { level: 1, name: t.main.title });
    const total = await screen.findByTestId("main-total");
    const search = screen.getByRole("region", { name: t.mainScreenLayout.regions.search });
    const filters = screen.getByRole("region", { name: t.filterChips.label });
    for (const later of [search, filters, total, screen.getByRole("region", { name: t.mainScreenLayout.regions.map })]) expect(follows(title, later)).toBe(true);
    expect(panel(search)).not.toBeNull();
    expect(panel(search)).toBe(panel(filters));
    expect(panel(total)).not.toBe(panel(search));
    expect(search.contains(title)).toBe(false);
  });

  it("titles the national map, and puts the tabs and the Show all button in the results panel", async () => {
    openAt(url);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await within(screen.getByRole("region", { name: t.mainScreenLayout.regions.map })).findByRole("heading", { name: t.main.mapTitle })).toBeVisible();
    const tabs = screen.getByRole("tablist");
    await waitFor(() => expect(within(screen.getByRole("region", { name: t.mainScreenLayout.regions.results })).getAllByRole("link").length).toBeGreaterThan(0));
    expect(panel(tabs)).not.toBeNull();
    for (const show of screen.queryAllByRole("link", { name: /^(Show all|Arată toate)/ })) expect(panel(show)).toBe(panel(tabs));
  });
});
