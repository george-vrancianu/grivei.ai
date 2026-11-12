// Seam 3 for ticket #84: the zoomed county against the recorded responses (`@grivei/contract` `fixtures/recorded`, made by
// seam 1). A county on the authority side zooms into its UAT choropleth; a UAT click filters the results; the way back
// clears both. The whole state (county, uat) lives in the URL and survives a reload, in both languages.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { LoadUatTopology } from "../../geo/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { plain, readTotal as total } from "../../testing/total.ts";
import { loadTestUatTopology } from "../../testing/uatTopology.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;
const open = (url: string, loadUat: LoadUatTopology = loadTestUatTopology) => {
  openAt(url);
  const { client, sent } = fixtureClient();
  return { ...render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadUat} />), sent };
};
/** A UAT (or county) of the map by its name: map areas are buttons named "<name>: <value>". */
const area = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}:`) });
const asked = (sent: { operation: string; variables: unknown }[], operation: string) => sent.filter((s) => s.operation === operation).map((s) => JSON.stringify(s.variables));

describe.each([
  { locale: "en", prefix: "", records: "8 Records", uatRecords: "2 Records", uatAwarded: "RON 2,000", grey: "Bran: No authority bought anything" },
  { locale: "ro", prefix: "/ro", records: "8 înregistrări", uatRecords: "2 înregistrări", uatAwarded: "2.000 RON", grey: "Bran: Nicio autoritate nu a cumpărat" },
] as const)("the zoomed county at $prefix/explore/", ({ locale, prefix, records, uatRecords, uatAwarded, grey }) => {
  const t = catalogue[locale];
  const base = `${prefix}/explore/`;
  const authorities = "&tab=authorities"; // the Authorities tab names the entities of the narrowed set

  it("opens from a county click, draws its UATs (grey where nothing was bought, the unknown-UAT row), and one request per operation", async () => {
    const { sent } = open(base);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByTestId("main-total")).toBeVisible());
    await user.click(area("Brașov"));
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-BV`));

    expect(await screen.findByRole("button", { name: t.zoomedCounty.back })).toBeVisible();
    expect(await screen.findByRole("heading", { name: t.zoomedCounty.title("Brașov", false) })).toBeVisible();
    for (const uat of ["Brașov", "Sânpetru", "Râșnov", "Ucea", "Șinca Nouă"]) expect(area(uat)).toBeVisible();
    expect(plain(area("Bran").getAttribute("aria-label"))).toBe(grey); // in the outlines, absent from the answer: grey
    expect(screen.getByText(t.zoomedCounty.map.unknownUat)).toBeVisible(); // the commune ANAF places in the county but SIRUTA does not know
    await waitFor(() => expect(total().records).toBe(records)); // the Total is the same filter's
    expect(asked(sent, "ZoomedCounty")).toEqual(['{"filter":{"county":"RO-BV"},"county":"RO-BV"}']);
    expect(asked(sent, "MainScreen")).toEqual(["{\"filter\":{}}", "{\"filter\":{\"county\":\"RO-BV\"}}"]);
  });

  it("filters by a UAT click (the zoom is not re-asked), takes it back on a second click, and survives a reload", async () => {
    const before = window.history.length;
    const first = open(`${base}?county=RO-BV${authorities}`);
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toBe(records));
    await screen.findByRole("button", { name: /^Sânpetru:/ });

    await user.click(area("Sânpetru"));
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-BV&uat=880010${authorities}`));
    await waitFor(() => expect(total()).toEqual({ awarded: uatAwarded, records: uatRecords }));
    expect(area("Sânpetru")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(t.zoomedCounty.selectedUat("Sânpetru"))).toBeVisible();
    const tabs = screen.getByRole("tabpanel");
    expect(tabs).toHaveTextContent("COMUNA SANPETRU");
    expect(tabs).not.toHaveTextContent("ORAS RASNOV"); // another UAT of the county
    expect(asked(first.sent, "ZoomedCounty")).toHaveLength(1); // the choropleth stays whole: the UAT is not in its variables
    first.unmount();

    // a reload at the same URL restores the zoom, the chosen UAT and the narrowed results
    expect(here()).toBe(`${base}?county=RO-BV&uat=880010${authorities}`);
    const second = open(here());
    await waitFor(() => expect(total()).toEqual({ awarded: uatAwarded, records: uatRecords }));
    expect(await screen.findByRole("button", { name: /^Sânpetru:/ })).toHaveAttribute("aria-pressed", "true");
    expect(asked(second.sent, "ZoomedCounty")).toEqual(['{"filter":{"county":"RO-BV"},"county":"RO-BV"}']);

    await user.click(area("Sânpetru")); // chosen already: the second click takes it back
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-BV${authorities}`));
    await waitFor(() => expect(total().records).toBe(records));
    expect(window.history.length).toBe(before); // every change replaced the entry
  });

  it("takes the UAT back with the clear button, and the way back out clears the county and the UAT", async () => {
    open(`${base}?county=RO-BV&uat=880010`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t.zoomedCounty.clearUat }));
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-BV`));
    await user.click(area("Ucea"));
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-BV&uat=880050`));

    await user.click(screen.getByRole("button", { name: t.zoomedCounty.back }));
    await waitFor(() => expect(here()).toBe(base)); // neither the county nor the UAT is left
    expect(await screen.findByRole("button", { name: /^Brașov:/ })).toBeVisible(); // the county map is back
    expect(screen.queryByRole("button", { name: t.zoomedCounty.back })).toBeNull();
  });

  it("zooms into Bucharest by its six sectors, and a sector is a UAT filter", async () => {
    open(`${base}?county=RO-B${authorities}`);
    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: t.zoomedCounty.title("București", true) })).toBeVisible();
    for (let n = 1; n <= 6; n += 1) expect(area(`Sector ${n}`)).toBeVisible();
    expect(screen.queryByText(t.zoomedCounty.map.unknownUat)).toBeNull(); // no authority is placed in Bucharest without a sector here
    await user.click(area("Sector 3"));
    await waitFor(() => expect(here()).toBe(`${base}?county=RO-B&uat=179169${authorities}`));
    expect(area("Sector 3")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("PRIMARIA SECTORULUI 3");
  });

  it("shows no unknown-UAT row for a county where every authority has a UAT", async () => {
    open(`${base}?county=RO-CJ`);
    expect(await screen.findByRole("button", { name: /^Apahida:/ })).toBeVisible();
    expect(screen.queryByText(t.zoomedCounty.map.unknownUat)).toBeNull();
    expect(plain(area("Cluj-Napoca").getAttribute("aria-label"))).toContain(t.zoomedCounty.map.map.noData);
  });

  it("keeps the query: the UAT sums and the results narrow together", async () => {
    const { sent } = open(`${base}?county=RO-BV&q=comuna${authorities}`);
    await screen.findByRole("button", { name: /^Sânpetru:/ });
    expect(screen.getByRole("tabpanel")).not.toHaveTextContent("ORAS RASNOV"); // "comuna" matches communes only
    expect(asked(sent, "ZoomedCounty")).toEqual(['{"filter":{"q":"comuna","county":"RO-BV"},"county":"RO-BV"}']);
    expect(asked(sent, "MainScreen")).toEqual(['{"filter":{"q":"comuna","county":"RO-BV"}}']);
  });
});

describe("the zoomed county where the county's outlines are missing or it is the supplier side", () => {
  it("says the map could not be loaded and offers the way back", async () => {
    open("/explore/?county=RO-IS");
    // no outlines for RO-IS (404) and no fixture for it: the screen has no recorded answer, but the map says so
    expect(await screen.findByText(catalogue.en.main.mapUnavailable)).toBeVisible();
    expect(screen.getByRole("button", { name: catalogue.en.zoomedCounty.back })).toBeVisible();
  });

  it("keeps the results working when the outlines of a recorded county cannot be fetched", async () => {
    open("/explore/?county=RO-BV", async () => Promise.reject(new Error("HTTP 404")));
    expect(await screen.findByText(catalogue.en.main.mapUnavailable)).toBeVisible();
    await waitFor(() => expect(total().records).toBe("8 Records"));
    expect(within(screen.getByRole("tabpanel")).getAllByRole("listitem").length).toBeGreaterThan(0);
    await userEvent.setup().click(screen.getByRole("button", { name: catalogue.en.zoomedCounty.back }));
    await waitFor(() => expect(here()).toBe("/explore/"));
  });

  it("does not zoom on the supplier side: the county stays on the county map and no UAT is asked for", async () => {
    const { sent } = open("/explore/?county=RO-BV&countySide=supplier");
    await waitFor(() => expect(total().records).toBe("16 Records"));
    expect(area("Brașov")).toHaveAttribute("aria-pressed", "true");
    expect(asked(sent, "ZoomedCounty")).toEqual([]);
  });

  it("caches a county's outlines: zooming back into it fetches nothing", async () => {
    const loaded: string[] = [];
    open("/explore/?county=RO-BV", async (county) => {
      loaded.push(county);
      return loadTestUatTopology(county);
    });
    const user = userEvent.setup();
    await screen.findByRole("button", { name: /^Sânpetru:/ });
    await user.click(screen.getByRole("button", { name: catalogue.en.zoomedCounty.back }));
    await user.click(await screen.findByRole("button", { name: /^Brașov:/ }));
    await screen.findByRole("button", { name: /^Sânpetru:/ });
    expect(loaded).toEqual(["RO-BV"]);
  });
});

describe("superseded zoom requests", () => {
  /** Holds every ZoomedCounty answer (the real fixtures, released by the test) and records its abort signal; other operations pass through. */
  function heldZoomClient() {
    const real = fixtureClient().client;
    const signals: AbortSignal[] = [];
    const release: (() => void)[] = [];
    const client: GraphqlClient = {
      query: (op, variables, options) => {
        const answer = real.query(op, variables, options);
        if (op.name !== "ZoomedCounty") return answer;
        if (options?.signal) signals.push(options.signal);
        return new Promise((resolve, reject) => void release.push(() => void answer.then(resolve, reject)));
      },
    };
    return { client, signals, release };
  }

  it("aborts the older request when the filter changes, and a stale answer that arrives late is never drawn", async () => {
    openAt("/explore/?county=RO-BV");
    const { client, signals, release } = heldZoomClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0]?.aborted).toBe(false);

    await userEvent.type(screen.getByRole("searchbox", { name: catalogue.en.searchBar.label }), "comuna");
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => {
      release[1]?.(); // the newer answer (q=comuna): Brașov has no Records in it
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const noData = catalogue.en.zoomedCounty.map.map.noData;
    expect(plain((await screen.findByRole("button", { name: /^Brașov:/ })).getAttribute("aria-label"))).toContain(noData);
    await act(async () => {
      release[0]?.(); // the older one (no q), which ignored the abort, arrives last
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(plain(area("Brașov").getAttribute("aria-label"))).toContain(noData); // still the newer answer
  });

  it("aborts the request when the page unmounts", async () => {
    openAt("/explore/?county=RO-BV");
    const { client, signals } = heldZoomClient();
    const { unmount } = render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
    await waitFor(() => expect(signals).toHaveLength(1));
    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });
});
