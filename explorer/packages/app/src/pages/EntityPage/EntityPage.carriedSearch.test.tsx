// Seam 3 for ticket #106: an entity row of a search carries the query and chips in the `search` parameter; the entity page opens unfiltered
// and its Records tab offers "only Records matching ...", only then. Following it applies the search as the Records filter (the URL's own
// filter), drops the parameter, and the totals follow. Both languages; both result screens.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { createClient } from "../../graphql/client.ts";
import { overviewNamed } from "../../testing/signalRecordings.ts";
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
const supplierLink = async (prefix: string, containing = "") =>
  waitFor(() => {
    const link = screen.getAllByRole("link").find((l) => (l.getAttribute("href") ?? "").startsWith(`${prefix}/explore/supplier/2000007`) && (l.getAttribute("href") ?? "").includes(containing));
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
    // the page URL carries the search, but the address the reader sees (and would cite, and copy) is the clean one
    expect(window.location.search).toContain("search=");
    expect(screen.getByText(`${window.location.host}${prefix}/explore/supplier/2000007`)).toBeVisible();
    expect(screen.queryByText(/search=/)).toBeNull();
    await userEvent.setup().click(recordsTab());
    const link = await screen.findByRole("link", { name: only.query("comuna") });
    expect(state().filter).toEqual({});
    expect(await total(13)).toBeVisible(); // unfiltered
    // supplementary guard beside the visible total above: the request itself carried no filter (an internal, so it never stands alone)
    expect(page.sent.filter((s) => s.operation === "EntityRecords").map((s) => (s.variables as { filter: unknown }).filter)).toEqual([{}]);

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
    expect(sent.filter((s) => s.operation !== "OnrcSearch")).toHaveLength(1); // supplementary guard beside the visible total: one EntityRecords request, nothing extra for a carried search
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

  it("the pinned Go to page card opens the plain entity page, while the rows of the same screen carry the search", async () => {
    const goTo = { key: "2000007", displayName: "FURNIZOR DEMO SRL", identity: "CUI", seap: { roles: ["SUPPLIER"] } };
    const fixture = fixtureClient({ rewrite: (operation, data) => (operation === "MainScreen" ? withGoTo(data, goTo) : data) });
    openAt(`${prefix}/explore/?q=comuna&tab=suppliers`);
    render(<App client={fixture.client} loadCountyTopology={loadTestCountyTopology} />);
    const card = await screen.findByRole("link", { name: `${t.results.goTo.open}: ${goTo.displayName}` });
    expect(card.getAttribute("href")).toBe(`${prefix}/explore/supplier/2000007`);
    expect((await supplierLink(prefix, "?search=")).getAttribute("href")).toContain("search=q%3Dcomuna");
  });
});

/** A MainScreen answer with the pinned go-to entity set. */
function withGoTo(data: unknown, goTo: unknown): unknown {
  const answer = data as { seap: { search: { goTo: unknown } } };
  answer.seap.search.goTo = goTo;
  return answer;
}

describe("the Records tab's suspect-value link keeps the carried search", () => {
  it("the '1 suspect value left out' link carries the search on", async () => {
    const { view } = open("/explore/authority/1000017/records?search=q%3Dcomuna");
    const suspect = await screen.findByRole("link", { name: "1 suspect value left out" });
    expect(decodeUrlState(suspect.getAttribute("href")!.split("?")[1] ?? "")).toMatchObject({ filter: { badges: ["SUSPECT_VALUE"] }, carried: { q: "comuna" } });
    view.unmount();
  });
});

// The Overview's Signals page links keep the carried search, like the tab links and the order toggle do. The recorded hospital has one page of
// Signals, so the count is raised to 45 for a second page (as in the signalOrder test).
describe("the Overview's Signals page links keep the carried search", () => {
  it("following Signals page 2, the Records tab still offers 'only Records matching'", async () => {
    const recorded = overviewNamed("authority-with-signals");
    const entity = recorded.data.entity!;
    const role = entity.seap.role!;
    const client = createClient({ fetch: async () => Response.json({ data: { entity: { ...entity, seap: { ...entity.seap, role: { ...role, signals: { ...role.signals, count: 45 } } } } } }) });
    openAt("/explore/authority/1000017?search=q%3Dcomuna");
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    const pager = await screen.findByRole("navigation", { name: catalogue.en.entityPage.signalPages.label });
    const next = within(pager).getByRole("link", { name: catalogue.en.entityPage.signalPages.page("2") });
    expect(next.getAttribute("href")).toContain("page=2");
    expect(decodeUrlState(next.getAttribute("href")!.split("?")[1] ?? "").carried).toEqual({ q: "comuna" });
    await userEvent.setup().click(next);
    await waitFor(() => expect(state()).toMatchObject({ page: 2, carried: { q: "comuna" } }));
    await waitFor(() => {
      const records = screen.getAllByRole("link").find((l) => (l.getAttribute("href") ?? "").includes("/records"));
      expect(records).toBeDefined();
      expect(decodeUrlState(records!.getAttribute("href")!.split("?")[1] ?? "").carried).toEqual({ q: "comuna" });
    });
  });
});
