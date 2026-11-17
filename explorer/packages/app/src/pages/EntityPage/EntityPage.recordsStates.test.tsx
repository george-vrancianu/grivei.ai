// Seam 3 for the Records tab's states and menus (#251): the Signal menu first with counts and ≈, the first-load skeleton with real labels, the last answer kept
// (dimmed, aria-busy) while the next loads, a failed request inside the Records panel, the order control, the carried `q` and the over-50 link of the Record page.
// EN and /ro/, over the API's recorded answers; the slow answer is held on a promise.
import type { RecordFilter } from "@grivei/contract";
import { fixtures } from "@grivei/contract/fixtures";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { decodeUrlState } from "../../urlState/codec.ts";

vi.setConfig({ testTimeout: 20_000 });
afterEach(() => window.history.replaceState(null, "", "/"));

const state = () => decodeUrlState(window.location.search);
const bar = (name: string) => within(screen.getByRole("region", { name }));
const recordsPanel = () => within(screen.getByRole("heading", { level: 2, name: /^(Records|Înregistrări)$/ }).closest("section")!);
const bodyOf = (panel: HTMLElement) => panel.querySelector<HTMLElement>('[data-panel-part="body"]')!;
const panelOf = (heading: string) => screen.getByRole("heading", { level: 2, name: heading }).closest("section")!;

/** The authority's recorded Records answered for another filter (a test-local recording: the contract has no fixture for it). */
function withFilter(filter: RecordFilter) {
  const recorded = fixtures.EntityRecords.find((f) => f.name === "authority")!;
  return { operation: "EntityRecords", variables: { ...(recorded.variables as object), filter }, data: recorded.data };
}

/** A hold that lets the first request through and keeps back every later one until `release()`. */
function holdAfterFirst() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const until = { then: (resolve: () => void, reject?: (reason: unknown) => void) => (++calls === 1 ? Promise.resolve() : gate).then(resolve, reject) } as unknown as Promise<void>;
  return { until, release };
}

describe.each(["en", "ro"] as const)("the Records tab (%s)", (locale) => {
  const t = catalogue[locale];
  const prefix = locale === "ro" ? "/ro" : "";
  const AUTHORITY = `${prefix}/explore/authority/1000017/records`;
  const own = t.entityPage.recordsTab;
  const BAR = t.entityPage.recordsTab.facets.label;

  it("offers the Signal menu first, each option with its count, and ≈ when estimated", async () => {
    const estimated = (operation: string, data: unknown) => {
      if (operation !== "EntityRecords") return data;
      const records = (data as { entity: { seap: { role: { records: { facets: { signal: { total: { estimated: boolean; records: number } }[] } } } } } }).entity.seap.role.records;
      for (const facet of records.facets.signal) facet.total = { ...facet.total, estimated: true, records: 12_400 };
      return data;
    };
    openAt(`${AUTHORITY}?order=value-desc`);
    render(<App client={fixtureClient({ rewrite: estimated }).client} />);
    await screen.findByRole("region", { name: BAR });
    const menus = bar(BAR).getAllByRole("button", { name: new RegExp(`${t.filterChips.menuAny}$`) });
    expect(menus[0]).toHaveTextContent(own.facets.groups.signal);
    expect(menus.slice(1, 3).map((m) => m.textContent)).toEqual([expect.stringContaining(own.facets.groups.channel), expect.stringContaining(own.facets.groups.procedure)]);
    await userEvent.setup().click(menus[0]!);
    const items = screen.getAllByRole("menuitemradio");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.textContent).toMatch(/\(≈\s12[,.]400\)$/);
  });

  it("shows the real labels while the first Records load, then the content", async () => {
    let release!: () => void;
    const until = new Promise<void>((resolve) => (release = resolve));
    openAt(AUTHORITY);
    render(<App client={fixtureClient({ hold: { operation: "EntityRecords", until } }).client} />);
    // the page has no header yet on a first load: the Records panel's title, the Total's heading and the bar's menu names are real text
    expect(await screen.findByRole("heading", { level: 2, name: own.heading })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: own.totalHeading })).toBeVisible();
    expect(screen.getByText(own.facets.groups.signal)).toBeInTheDocument();
    expect(within(panelOf(own.totalHeading)).getByText(t.total.figures.records)).toBeInTheDocument();
    expect(screen.getAllByRole("status").map((s) => s.textContent).filter(Boolean)).toEqual([t.status.loading]);
    expect(screen.queryByRole("table")).toBeNull();
    release();
    expect(await screen.findByRole("table", { name: own.table.label })).toBeVisible();
    expect(screen.queryByText(t.status.loading)).toBeNull();
  });

  it("keeps the last answer, dimmed and aria-busy, with the bar and the headers at full strength, until the next one lands", async () => {
    const { until, release } = holdAfterFirst();
    openAt(AUTHORITY);
    render(<App client={fixtureClient({ hold: { operation: "EntityRecords", until } }).client} />);
    await screen.findByRole("table", { name: own.table.label });
    const rowsBefore = within(screen.getByRole("table", { name: own.table.label })).getAllByRole("row").length;
    await userEvent.setup().click(bar(BAR).getByRole("button", { name: new RegExp(`^${own.facets.groups.channel}`) }));
    await userEvent.setup().click(screen.getByRole("menuitemradio", { name: /(Direct purchase|Achiziție directă) \(8\)/ }));
    await waitFor(() => expect(bodyOf(panelOf(own.heading))).toHaveAttribute("aria-busy", "true"));
    expect(bodyOf(panelOf(own.totalHeading))).toHaveAttribute("aria-busy", "true");
    // the old rows are still there, the bar and the headers are not busy, and the Records header says it is loading
    expect(within(screen.getByRole("table", { name: own.table.label })).getAllByRole("row")).toHaveLength(rowsBefore);
    expect(screen.getByRole("region", { name: BAR }).closest("[aria-busy='true']")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).closest("[aria-busy='true']")).toBeNull();
    expect(within(panelOf(own.heading)).getByRole("status")).toHaveTextContent(t.status.loading);
    release();
    await waitFor(() => expect(within(screen.getByRole("table", { name: own.table.label })).getAllByRole("row")).toHaveLength(9));
    expect(bodyOf(panelOf(own.heading))).not.toHaveAttribute("aria-busy");
  });

  it("puts a failed request inside the Records panel with its retry, and keeps the header and the tabs", async () => {
    openAt(`${prefix}/explore/authority/1000017`);
    render(<App client={fixtureClient({ failing: ["EntityRecords"] }).client} />);
    await screen.findByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" });
    const tabs = within(screen.getByRole("navigation", { name: t.entityPage.layout.label }));
    await userEvent.setup().click(tabs.getByRole("link", { name: new RegExp(`^${t.entityPage.layout.tabs.records}`) }));
    const panel = await waitFor(() => recordsPanel());
    expect(await panel.findByText(t.status.failed)).toBeVisible();
    expect(panel.getByRole("button", { name: t.status.retry })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
    expect(tabs.getByRole("link", { name: new RegExp(`^${t.entityPage.layout.tabs.records}`) })).toHaveAttribute("aria-current", "page");
  });

  it("changes the order from the Records panel's header and keeps it in the URL, back to page 1", async () => {
    openAt(`${AUTHORITY}?order=value-desc`);
    const { sent } = (() => {
      const fixture = fixtureClient();
      render(<App client={fixture.client} />);
      return fixture;
    })();
    await screen.findByRole("table", { name: own.table.label });
    await userEvent.setup().selectOptions(recordsPanel().getByRole("combobox", { name: t.fullResults.order.label }), "DATE_ASC");
    await waitFor(() => expect(state().order).toBe("DATE_ASC"));
    await waitFor(() => expect(sent.at(-1)).toMatchObject({ operation: "EntityRecords", variables: { order: "DATE_ASC", offset: 0 } }));
  });

  it("clears every filter from the active row, keeping nothing of them in the URL", async () => {
    openAt(`${AUTHORITY}?from=2023-01-01&to=2023-12-31&channel=contract`);
    render(<App client={fixtureClient().client} />);
    await screen.findByRole("region", { name: BAR });
    const row = within(screen.getByRole("group", { name: t.filterChips.active.group }));
    await userEvent.setup().click(row.getByRole("button", { name: own.empty.clear }));
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("shows a search text the page holds as its own chip, which clears only the text", async () => {
    const filter: RecordFilter = { q: "comuna", channel: "CONTRACT" };
    openAt(`${AUTHORITY}?q=comuna&channel=contract`);
    render(<App client={fixtureClient({ extra: [withFilter(filter)] }).client} />);
    await screen.findByRole("region", { name: BAR });
    expect(state().filter).toEqual(filter);
    await userEvent.setup().click(screen.getByRole("button", { name: t.filterChips.active.remove(own.onlyMatching.query("comuna")) }));
    await waitFor(() => expect(state().filter).toEqual({ channel: "CONTRACT" }));
  });

  it("keeps the Record page's over-50 link working: the authority's Records tab on the subsequent contracts, with the badge and the notice code as chips", async () => {
    const filter: RecordFilter = { badges: ["SUBSEQUENT_CONTRACT"], q: "CAN9600001" };
    const extra = [withFilter(filter)];
    openAt(`${AUTHORITY}?q=CAN9600001&badges=subsequent-contract`);
    render(<App client={fixtureClient({ extra }).client} />);
    await screen.findByRole("table", { name: own.table.label });
    const row = within(screen.getByRole("group", { name: t.filterChips.active.group }));
    expect(row.getByRole("button", { name: t.filterChips.active.remove(t.badges.SUBSEQUENT_CONTRACT.label) })).toBeVisible();
    await userEvent.setup().click(row.getByRole("button", { name: t.filterChips.active.remove(own.onlyMatching.query("CAN9600001")) }));
    await waitFor(() => expect(state().filter).toEqual({ badges: ["SUBSEQUENT_CONTRACT"] }));
  });
});
