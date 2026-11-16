// Seam 3: the main screen keeps its last answer on screen, dimmed and `aria-busy`, while a filter or county change loads, and swaps when the
// new answer lands. The second request of an operation is held on a promise, so the pending state can be read (as in the entity page's keep-last test). EN and /ro/.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { navigate } from "../../routing/location.tsx";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { readTotal } from "../../testing/total.ts";
import { loadTestUatTopology } from "../../testing/uatTopology.ts";

afterEach(() => openAt("/"));

/** The fixture network, where the second request of each named operation waits for `release()`. */
function heldClient(...operations: string[]) {
  const real = fixtureClient();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const counts = new Map<string, number>();
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      const n = (counts.get(op.name) ?? 0) + 1;
      counts.set(op.name, n);
      if (n === 2 && operations.includes(op.name)) await gate;
      return real.client.query(op, variables, options);
    },
  };
  return { client, release: () => act(() => release()), sent: real.sent };
}

const open = (url: string, client: GraphqlClient) => {
  openAt(url);
  return render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
};
const PSD = `party=${encodeURIComponent("PARTIDUL SOCIAL DEMOCRAT")}`;
const busy = (el: Element) => el.closest("[aria-busy]")?.getAttribute("aria-busy");

describe.each([
  { locale: "en", base: "/explore/" },
  { locale: "ro", base: "/ro/explore/" },
] as const)("the main screen while the next answer loads at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const region = (name: string) => screen.getByRole("region", { name });
  const results = () => region(t.mainScreenLayout.regions.results);
  const mapPanel = () => region(t.mainScreenLayout.regions.map);
  /** The results' rows (the tab panel's wrapper): dimmed and busy; the header with the tabs and the status line is not. */
  const rows = () => within(results()).getByRole("tabpanel").closest("[aria-busy]");
  const totalPanel = () => screen.getByTestId("main-total").closest(".MuiCard-root")!;
  const readyTotal = () => screen.findByTestId("main-total", {}, { timeout: 5000 }).then(() => readTotal());

  it("keeps the Total and the rows dimmed and aria-busy after a filter change, with a Loading line, then swaps", async () => {
    const { client, release } = heldClient("MainScreen");
    open(base, client);
    const before = await readyTotal();
    await waitFor(() => expect(within(results()).getAllByRole("link").length).toBeGreaterThan(0));
    const rowsBefore = within(results()).getAllByRole("link").map((a) => a.textContent);
    expect(within(results()).queryByRole("status")).toBeNull();
    expect(totalPanel()).not.toHaveAttribute("aria-busy");

    act(() => navigate(`${base}?${PSD}`, "replace"));
    expect(readTotal()).toEqual(before); // the previous Total stays
    expect(document.querySelector(".MuiSkeleton-root")).toBeNull(); // a refetch dims the answer; it never shows skeletons
    expect(totalPanel()).toHaveAttribute("aria-busy", "true");
    expect(totalPanel()).toHaveStyle({ opacity: "0.6" });
    expect(rows()).toHaveAttribute("aria-busy", "true");
    expect(rows()).toHaveStyle({ opacity: "0.6" });
    expect(within(results()).getAllByRole("link").map((a) => a.textContent)).toEqual(rowsBefore);
    expect(within(results()).getByRole("status")).toHaveTextContent(t.status.loading);
    expect(within(results()).getByRole("status").closest("[aria-busy]")).toBeNull(); // the line is outside the busy region, at full strength, so it is announced
    expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true"); // a filter, not typing: the search field does not spin

    release();
    await waitFor(() => expect(readTotal()).not.toEqual(before));
    expect(totalPanel()).not.toHaveAttribute("aria-busy");
    expect(rows()).toBeNull();
    expect(within(results()).queryByRole("status")).toBeNull();
  });

  it("spins the search field for a typed query, and only then", async () => {
    const { client, release } = heldClient("MainScreen");
    open(base, client);
    await readyTotal();
    await userEvent.type(screen.getByRole("searchbox", { name: t.searchBar.label }), "comuna");
    await waitFor(() => expect(screen.getByRole("search")).toHaveAttribute("aria-busy", "true"));
    expect(totalPanel()).toHaveAttribute("aria-busy", "true"); // the old Total is held beside the spinner
    release();
    await waitFor(() => expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true"));
  });

  it("sends no query and shows no loading state on a tab switch", async () => {
    const { client, sent } = heldClient();
    open(base, client);
    await readyTotal();
    const asked = () => sent.filter((s) => s.operation === "MainScreen").length;
    const before = asked();
    await userEvent.click(within(results()).getByRole("tab", { name: new RegExp(`^${t.results.tabs.authorities}`) }));
    await waitFor(() => expect(window.location.search).toContain("tab=authorities"));
    expect(asked()).toBe(before);
    expect(within(results()).queryByRole("status")).toBeNull();
    expect(rows()).toBeNull();
    expect(totalPanel()).not.toHaveAttribute("aria-busy");
  });

  it("keeps the zoomed county map for the same county across a filter change, dimmed under a still full-strength lens toggle", async () => {
    const { client, release } = heldClient("ZoomedCounty");
    open(`${base}?county=RO-BV`, client);
    const title = t.zoomedCounty.title("Brașov", false);
    await screen.findByRole("heading", { name: title });
    act(() => navigate(`${base}?county=RO-BV&q=comuna`, "replace"));
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(busy(screen.getByRole("heading", { name: title }))).toBe("true");
    expect(busy(within(mapPanel()).getByRole("group", { name: t.mainScreenLayout.lens.label }))).toBeUndefined();
    release();
    await waitFor(() => expect(busy(screen.getByRole("heading", { name: title }))).toBeUndefined());
  });

  it("shows the zoom's loading state, not the old county, when the county changes, while the Total keeps its last answer", async () => {
    const { client, release } = heldClient("ZoomedCounty", "MainScreen");
    open(`${base}?county=RO-BV`, client);
    const old = t.zoomedCounty.title("Brașov", false);
    await screen.findByRole("heading", { name: old });
    const before = await readyTotal();
    act(() => navigate(`${base}?county=RO-CJ`, "replace"));
    expect(screen.queryByRole("heading", { name: old })).toBeNull(); // county B's map is never titled with A's name
    expect(within(mapPanel()).getByText(t.status.loading)).toBeVisible();
    expect(mapPanel().querySelector(".MuiSkeleton-root, svg[aria-hidden] path")).not.toBeNull(); // a skeleton, as on a first load
    expect(mapPanel().querySelector('[aria-busy="true"]')).toBeNull(); // not county A's answer, dimmed
    expect(readTotal()).toEqual(before); // the main query holds across a county change
    expect(totalPanel()).toHaveAttribute("aria-busy", "true");
    release();
    expect(await screen.findByRole("heading", { name: t.zoomedCounty.title("Cluj", false) })).toBeVisible();
    await waitFor(() => expect(readTotal()).not.toEqual(before));
  });

  it("keeps the Coverage lens map dimmed while the date window loads", async () => {
    const { client, release } = heldClient("CoverageLens");
    open(`${base}?lens=coverage`, client);
    const national = () => within(mapPanel()).getByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.national}`) });
    await waitFor(() => expect(national()).toBeVisible());
    act(() => navigate(`${base}?from=2023-01-01&lens=coverage`, "replace"));
    expect(national()).toBeVisible();
    expect(busy(national())).toBe("true");
    expect(busy(within(mapPanel()).getByRole("group", { name: t.mainScreenLayout.lens.label }))).toBeUndefined();
    release();
    await waitFor(() => expect(busy(national())).toBeUndefined());
  });

  it("keeps the Loading line while only the zoomed county's request is in flight", async () => {
    const { client, release } = heldClient("ZoomedCounty");
    open(`${base}?county=RO-BV`, client);
    await screen.findByRole("heading", { name: t.zoomedCounty.title("Brașov", false) });
    await readyTotal();
    act(() => navigate(`${base}?county=RO-BV&q=comuna`, "replace"));
    await waitFor(() => expect(totalPanel()).not.toHaveAttribute("aria-busy")); // the main query has answered
    expect(within(results()).getByRole("status")).toHaveTextContent(t.status.loading);
    release();
    await waitFor(() => expect(within(results()).queryByRole("status")).toBeNull());
  });

  it("keeps the Loading line while only the Coverage lens request is in flight", async () => {
    const { client, release } = heldClient("CoverageLens");
    open(`${base}?county=RO-CJ&lens=coverage`, client);
    await waitFor(() => expect(within(mapPanel()).getByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.national}`) })).toBeVisible());
    await waitFor(() => expect(within(results()).getAllByRole("link").length).toBeGreaterThan(0));
    act(() => navigate(`${base}?county=RO-CJ&from=2023-01-01&to=2023-12-31&lens=coverage`, "replace"));
    await waitFor(() => expect(results().querySelector("[aria-busy]")).toBeNull()); // the main query has answered
    expect(within(results()).getByRole("status")).toHaveTextContent(t.status.loading);
    release();
    await waitFor(() => expect(within(results()).queryByRole("status")).toBeNull());
  });
});
