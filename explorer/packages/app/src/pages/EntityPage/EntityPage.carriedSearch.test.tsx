// Seam 3 for ticket #106: an entity row of a search carries the query and chips in the `search` parameter; the entity page opens unfiltered
// and its Records tab offers "only Records matching ...", only then. Following it applies the search as the Records filter (the URL's own
// filter), drops the parameter, and the totals follow. Both languages; both result screens.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { decodeUrlState } from "../../urlState/codec.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const state = () => decodeUrlState(window.location.search);
const open = (url: string) => {
  openAt(url);
  const fixture = fixtureClient();
  const view = render(<App client={fixture.client} loadCountyTopology={loadTestCountyTopology} />);
  return { ...fixture, view };
};
/** Entity rows are plain anchors (a full page load, as the whole app serves them): follow one as the browser would, by loading its URL afresh. */
function loadLink(view: { unmount: () => void }, link: HTMLElement) {
  const href = link.getAttribute("href")!;
  view.unmount();
  return open(href);
}
/** The supplier row's link (key 2000007), wherever the screen shows it. */
const supplierLink = async (prefix: string) =>
  waitFor(() => {
    const link = screen.getAllByRole("link").find((l) => (l.getAttribute("href") ?? "").startsWith(`${prefix}/explore/supplier/2000007`));
    expect(link).toBeDefined();
    return link!;
  });

describe.each([
  { locale: "en", prefix: "" },
  { locale: "ro", prefix: "/ro" },
] as const)("only Records matching, at $prefix/explore/", ({ locale, prefix }) => {
  const t = catalogue[locale];
  const only = t.entityPage.recordsTab.onlyMatching;
  const recordsTab = () => screen.getAllByRole("link").find((l) => (l.getAttribute("href") ?? "").includes("/records"))!;
  const total = (n: number) => screen.findByText(t.total.records(n, String(n)));

  it("from the main screen with a query: the row opens the unfiltered page, the Records tab offers the link, following it filters and updates the totals", async () => {
    const { view } = open(`${prefix}/explore/?q=comuna&tab=suppliers`);
    const row = await supplierLink(prefix);
    expect(decodeUrlState(row.getAttribute("href")!.split("?")[1] ?? "")).toEqual({ filter: {}, carried: { q: "comuna" } });
    const page = loadLink(view, row);

    await screen.findByRole("heading", { level: 1 });
    expect(state()).toEqual({ filter: {}, carried: { q: "comuna" } }); // the entity's own filter is empty
    expect(window.location.pathname).toBe(`${prefix}/explore/supplier/2000007`);
    await userEvent.setup().click(recordsTab());
    const link = await screen.findByRole("link", { name: only.query("comuna") });
    expect(state().filter).toEqual({});
    expect(page.sent.filter((s) => s.operation === "EntityRecords").map((s) => (s.variables as { filter: unknown }).filter)).toEqual([{}]);
    expect(await total(13)).toBeVisible(); // unfiltered

    await userEvent.setup().click(link);
    await waitFor(() => expect(state()).toEqual({ filter: { q: "comuna" } })); // applied through the URL filter; the parameter is gone
    expect(await total(3)).toBeVisible();
    expect(screen.queryByRole("link", { name: only.query("comuna") })).toBeNull();
    expect(window.location.pathname).toBe(`${prefix}/explore/supplier/2000007/records`);
  });

  it("from the main screen with chips only: the link says the search's filters and applies the chips", async () => {
    const { view } = open(`${prefix}/explore/?channel=direct-purchase&tab=suppliers`);
    const row = await supplierLink(prefix);
    expect(decodeUrlState(row.getAttribute("href")!.split("?")[1] ?? "").carried).toEqual({ channel: "DIRECT_PURCHASE" });
    loadLink(view, row);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.setup().click(recordsTab());
    await userEvent.setup().click(await screen.findByRole("link", { name: only.filters }));
    await waitFor(() => expect(state()).toEqual({ filter: { channel: "DIRECT_PURCHASE" } }));
    expect(await total(6)).toBeVisible();
  });

  it("with a query and a chip: the link names the query and applies both", async () => {
    const { view } = open(`${prefix}/explore/?q=comuna&channel=direct-purchase&tab=suppliers`);
    loadLink(view, await supplierLink(prefix));
    await screen.findByRole("heading", { level: 1 });
    await userEvent.setup().click(recordsTab());
    await userEvent.setup().click(await screen.findByRole("link", { name: only.query("comuna") }));
    await waitFor(() => expect(state()).toEqual({ filter: { q: "comuna", channel: "DIRECT_PURCHASE" } }));
    expect(await total(2)).toBeVisible();
  });

  it("from the full-results view: the row carries the search the same way", async () => {
    const { view } = open(`${prefix}/explore/search?q=comuna`);
    const row = await supplierLink(prefix);
    expect(decodeUrlState(row.getAttribute("href")!.split("?")[1] ?? "")).toEqual({ filter: {}, carried: { q: "comuna" } });
    loadLink(view, row);
    await screen.findByRole("heading", { level: 1 });
    expect(state().filter).toEqual({});
    await userEvent.setup().click(recordsTab());
    await userEvent.setup().click(await screen.findByRole("link", { name: only.query("comuna") }));
    await waitFor(() => expect(state()).toEqual({ filter: { q: "comuna" } }));
    expect(await total(3)).toBeVisible();
  });

  it("shows no link when the page is opened directly, or from a search with no query and no chips", async () => {
    const { sent } = open(`${prefix}/explore/supplier/2000007/records`);
    expect(await total(13)).toBeVisible();
    expect(screen.queryByRole("link", { name: /^(only Records|doar înregistrările)/ })).toBeNull();
    expect(sent).toHaveLength(1);
  });

  it("carries nothing from a search with no query and no chips, and offers no link on the page it opens", async () => {
    const { view } = open(`${prefix}/explore/?tab=suppliers`);
    const row = await supplierLink(prefix);
    expect(row.getAttribute("href")).toBe(`${prefix}/explore/supplier/2000007`);
    loadLink(view, row);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.setup().click(recordsTab());
    await total(13);
    expect(screen.queryByRole("link", { name: /^(only Records|doar înregistrările)/ })).toBeNull();
  });
});
