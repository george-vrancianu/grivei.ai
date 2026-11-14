// Seam 3 for ONRC's screen (#178): the app at `?source=onrc`, answering from the contract's OnrcSearch fixtures (hand-written in #176, asserted against the real API by seam 1)
// through the injected fetch, and from the recorded SEAP answer for the picker's count of the other Source.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtures } from "@grivei/contract/fixtures";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { ONRC_TYPICAL_COUNT, onrcWholeCoverage, SEAP_TEXT_QUERY_RECORDS, seapCountFor } from "../../testing/sourceFixtures.ts";
import { decodeOnrcScreen } from "../../urlState/onrcScreen.ts";

afterEach(() => openAt("/"));

const fixtureData = () => structuredClone(fixtures.OnrcSearch[0]!.data);
const FILTERED = "status=1048&caen=62&county=UNPLACED&registeredFrom=2020-01-01&registeredTo=2026-12-31&seapCounterparty=false";

function open(url: string, extra = [seapCountFor("alfa beta"), onrcWholeCoverage]) {
  openAt(url);
  const fixture = fixtureClient({ extra });
  render(<App client={fixture.client} loadCountyTopology={loadTestCountyTopology} />);
  return fixture;
}
const here = () => `${window.location.pathname}${window.location.search}`;

describe.each([
  { locale: "en", base: "/explore/", c: catalogue.en },
  { locale: "ro", base: "/ro/explore/", c: catalogue.ro },
] as const)("ONRC's screen at $base", ({ base, c }) => {
  const s = c.sources;

  it("lists the registrations for the query with the match count, ONRC chosen in the picker, and both Sources' counts side by side", async () => {
    const { sent } = open(`${base}?q=alfa+beta&source=onrc`);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(ONRC_TYPICAL_COUNT, String(ONRC_TYPICAL_COUNT)) })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: s.onrc.title })).toBeVisible();
    const picker = within(screen.getByRole("group", { name: s.picker.label }));
    expect(picker.getByRole("button", { name: `ONRC · ${s.counts.ONRC(ONRC_TYPICAL_COUNT, String(ONRC_TYPICAL_COUNT))}`, pressed: true })).toBeVisible();
    await waitFor(() => expect(picker.getByRole("button", { name: `SEAP · ${s.counts.SEAP(SEAP_TEXT_QUERY_RECORDS, String(SEAP_TEXT_QUERY_RECORDS))}`, pressed: false })).toBeVisible());
    // one OnrcSearch for the screen; the other Source's count is its own request for the query text alone
    expect(sent.map((r) => [r.operation, JSON.stringify((r.variables as { filter: unknown }).filter)])).toEqual([["OnrcSearch", '{"q":"alfa beta"}'], ["FullResultsRecords", '{"q":"alfa beta"}']]);
    // ...and neither asks for rows: the picker only reads a count
    expect(sent.map((r) => (r.variables as { limit?: number }).limit)).toEqual([50, 0]);
    // ONRC's results, and only those: no SEAP tab, no SEAP total
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByTestId("main-total")).toBeNull();
  });

  it("shows each registration with the match highlighted and links its organisation to its entity page", async () => {
    open(`${base}?q=alfa+beta&source=onrc`);
    const list = within(await screen.findByRole("list"));
    const rows = list.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole("link", { name: "ALFA ONRC SRL" })).toHaveAttribute("href", `${base.replace("explore/", "explore")}/supplier/3100020`);
    expect(rows[0]!.querySelector("mark")).toHaveTextContent("ALFA");
    expect(rows[1]).toHaveTextContent(`${s.onrc.results.row.matchedIn(s.onrc.results.row.fields.ALIAS)}: BETA VECHI SRL`);
  });

  it("reads every chip from the URL and shows the registrations that filter leaves, Unplaced and undated ones included", async () => {
    open(`${base}?${FILTERED}&source=onrc`);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(3, "3") })).toBeVisible();
    const active = within(screen.getByRole("group", { name: s.onrc.filterChips.active.group }));
    expect(active.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      s.onrc.filterChips.active.remove(s.onrc.filterChips.status.options[1048]!),
      s.onrc.filterChips.active.remove(s.onrc.filterChips.active.caen("62")),
      s.onrc.filterChips.active.remove(s.onrc.filterChips.active.unplaced),
      expect.stringContaining(s.onrc.filterChips.active.remove("").trim()),
      expect.stringContaining(s.onrc.filterChips.active.remove("").trim()),
      s.onrc.filterChips.active.remove(s.onrc.filterChips.active.seapCounterparty.no),
      null, // Clear all
    ]);
  });

  it("changes the URL when a chip is removed (history replaced), keeping the other chips, and starts at the new matching set", async () => {
    open(`${base}?${FILTERED}&source=onrc`);
    await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(3, "3") });
    const before = window.history.length;
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.active.remove(s.onrc.filterChips.active.caen("62")) }));
    await waitFor(() => expect(decodeOnrcScreen(window.location.search).filter).toEqual({ status: [1048], county: "UNPLACED", registeredFrom: "2020-01-01", registeredTo: "2026-12-31", seapCounterparty: false }));
    expect(window.location.search).toContain("source=onrc");
    expect(window.history.length).toBe(before);
  });

  it("puts a chip clicked in the URL, in the canonical order, with the Source last", async () => {
    open(`${base}?q=alfa+beta&source=onrc`);
    await screen.findByRole("list");
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.status.options[1107]!, pressed: false }));
    await waitFor(() => expect(window.location.search).toBe("?q=alfa+beta&status=1107&source=onrc"));
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.seapCounterparty.no, pressed: false }));
    await waitFor(() => expect(window.location.search).toBe("?q=alfa+beta&status=1107&seapCounterparty=false&source=onrc"));
  });

  it("makes the Unplaced tile a chip of the filter, in the URL", async () => {
    open(`${base}?q=alfa+beta&source=onrc`);
    await screen.findByRole("list");
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^${s.onrc.countMap.unplaced}`) }));
    await waitFor(() => expect(window.location.search).toBe("?q=alfa+beta&county=UNPLACED&source=onrc"));
  });

  it("takes the county back on a second click on the chosen tile", async () => {
    open(`${base}?${FILTERED}&source=onrc`);
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^${s.onrc.countMap.unplaced}`), pressed: true }));
    await waitFor(() => expect(decodeOnrcScreen(window.location.search).filter).not.toHaveProperty("county"));
    expect(decodeOnrcScreen(window.location.search).filter).toMatchObject({ status: [1048], caen: "62" });
  });

  it("names the counties of the count lens with their registration counts", async () => {
    open(`${base}?q=alfa+beta&source=onrc`);
    expect(await screen.findByRole("button", { name: `Cluj: ${s.onrc.countMap.registrations(1, "1")}` })).toBeVisible();
  });

  it("goes to SEAP with the same query from the picker, and SEAP's URL is the plain one", async () => {
    open(`${base}?q=alfa+beta&status=1107&source=onrc`);
    await screen.findByRole("group", { name: s.picker.label });
    await userEvent.click(within(screen.getByRole("group", { name: s.picker.label })).getByRole("button", { name: /^SEAP/ }));
    expect(here()).toBe(`${base}?q=alfa+beta`); // the chips stay behind, the query goes along, and no Source in the URL means SEAP
    expect(await screen.findByRole("searchbox", { name: c.searchBar.label })).toHaveValue("alfa beta");
  });

  it("types a query into the URL with the Source kept", async () => {
    open(`${base}?source=onrc`, [onrcWholeCoverage]);
    await userEvent.type(await screen.findByRole("searchbox", { name: s.onrc.searchBar.label }), "alfa beta");
    await waitFor(() => expect(window.location.search).toBe("?q=alfa+beta&source=onrc"));
  });

  it("pages the Organisations tab with real links (the page after the filter, the Source last), and opens a page from the URL at its offset", async () => {
    const more = (operation: string, data: unknown) => {
      if (operation !== "OnrcSearch") return data;
      const search = (data as { onrc: { search: { count: number; organisations: { count: number } } } }).onrc.search;
      search.count = 120;
      search.organisations.count = 120;
      return data;
    };
    openAt(`${base}?q=alfa+beta&source=onrc`);
    const first = fixtureClient({ rewrite: more });
    const view = render(<App client={first.client} loadCountyTopology={loadTestCountyTopology} />);
    const nav = within(await screen.findByRole("navigation", { name: s.onrc.results.pagination.label }));
    expect(nav.getByRole("link", { name: s.onrc.results.pagination.page("2") })).toHaveAttribute("href", `${base}?q=alfa+beta&page=2&source=onrc`);
    expect(screen.getByText(s.onrc.results.showing("1", "2", "120"))).toBeVisible();
    view.unmount();

    openAt(`${base}?q=alfa+beta&page=2&source=onrc`);
    const second = fixtureClient({ rewrite: more, extra: [{ operation: "OnrcSearch", variables: { filter: { q: "alfa beta" }, limit: 50, offset: 50 }, data: fixtureData() }] });
    render(<App client={second.client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText(s.onrc.results.showing("51", "52", "120"))).toBeVisible();
    expect(second.sent[0]?.variables).toEqual({ filter: { q: "alfa beta" }, limit: 50, offset: 50 });
  });

  it("says when a query finds nothing, with the way to ONRC's coverage", async () => {
    open(`${base}?q=inexistent&source=onrc`);
    expect(await screen.findByText(s.onrc.results.empty)).toBeVisible();
    expect(screen.getByRole("link", { name: s.onrc.results.emptyLink })).toHaveAttribute("href", `${base.replace("explore/", "explore")}/coverage?source=onrc`);
  });

  it("settles on a message when the search fails", async () => {
    openAt(`${base}?q=alfa+beta&source=onrc`);
    render(<App client={fixtureClient({ failing: ["OnrcSearch"] }).client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText(c.status.failed)).toBeVisible();
  });

  it("opens the Coverage lens with the Source selector and ONRC's snapshots, a missing month as a known gap in this Source's words", async () => {
    const { sent } = open(`${base}?q=alfa+beta&lens=coverage&source=onrc`);
    const table = await screen.findByRole("table", { name: s.onrc.coverage.snapshots.label });
    const gap = within(table).getAllByRole("row").find((r) => r.getAttribute("data-state") === "KNOWN_GAP")!;
    expect(gap).toHaveTextContent(s.onrc.coverage.snapshots.missingSnapshot);
    expect(gap).toHaveTextContent(c.coverage.grid.states.KNOWN_GAP);
    expect(sent.some((r) => r.operation === "OnrcCoverage")).toBe(true);
    const selector = within(screen.getByRole("group", { name: s.coverageSwitch.label }));
    expect(selector.getByRole("button", { name: "ONRC", pressed: true })).toBeVisible();
    await userEvent.click(selector.getByRole("button", { name: "SEAP" }));
    expect(here()).toBe(`${base}?q=alfa+beta&lens=coverage`);
  });

  it("asks for ONRC's coverage only while the lens is shown", async () => {
    const { sent } = open(`${base}?q=alfa+beta&source=onrc`);
    await screen.findByRole("list");
    expect(sent.some((r) => r.operation === "OnrcCoverage")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: c.mainScreenLayout.lens.coverage }));
    await waitFor(() => expect(window.location.search).toBe("?q=alfa+beta&lens=coverage&source=onrc"));
  });

  it("opens the full-results URL of ONRC as the same screen", async () => {
    const path = base.replace("explore/", "explore/search");
    open(`${path}?q=alfa+beta&source=onrc`);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(ONRC_TYPICAL_COUNT, String(ONRC_TYPICAL_COUNT)) })).toBeVisible();
  });
});
