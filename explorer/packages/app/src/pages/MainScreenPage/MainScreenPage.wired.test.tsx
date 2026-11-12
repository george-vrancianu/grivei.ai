// Seam 3 for ticket #83: the main screen against the recorded responses (`@grivei/contract` `fixtures/recorded`, made by
// seam 1). One query per filter feeds the map, the Total and the tabs; the whole state lives in the URL.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;
const open = (url: string) => {
  openAt(url);
  const { client, sent } = fixtureClient();
  return { ...render(<App client={client} loadCountyTopology={loadTestCountyTopology} />), sent };
};
/** Money is written with a no-break space after the currency code: read it as the plain space a reader sees. */
const plain = (text: string | null) => (text ?? "").replaceAll("\u00a0", " ");
const total = () => ({ awarded: plain(screen.getByTestId("total-awarded").textContent), records: plain(screen.getByTestId("total-records").textContent) });
const county = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}:`) });
const nameOf = (element: HTMLElement) => plain(element.getAttribute("aria-label") ?? element.textContent);
/** The query strings of every MainScreen request, in order. */
const asked = (sent: { operation: string; variables: unknown }[]) => sent.filter((s) => s.operation === "MainScreen").map((s) => JSON.stringify((s.variables as { filter: unknown }).filter));

describe.each([
  { locale: "en", url: "/explore/", records: "18 Records", narrowed: "8 Records", mapName: "Brașov: RON 5,000" },
  { locale: "ro", url: "/ro/explore/", records: "18 înregistrări", narrowed: "8 înregistrări", mapName: "Brașov: 5.000 RON" },
] as const)("typing on the main screen at $url", ({ locale, url, records, narrowed, mapName }) => {
  it("narrows the map, the Total and the tabs together, with one MainScreen query per filter", async () => {
    const { sent } = open(url);
    const t = catalogue[locale];
    await waitFor(() => expect(total().records).toContain(records));
    expect(nameOf(county("Brașov"))).toBe(locale === "en" ? "Brașov: RON 8,000" : "Brașov: 8.000 RON");
    const tabs = () => screen.getByRole("tabpanel");
    expect(tabs()).toHaveTextContent("ȘANTIERUL ȚARA DEMO SRL");
    expect(screen.getByRole("button", { name: new RegExp(`^${t.moneyLensMap.tiles.national}`) })).toBeVisible();

    await userEvent.type(screen.getByRole("searchbox", { name: t.searchBar.label }), "comuna");
    await waitFor(() => expect(here()).toBe(`${url}?q=comuna`));

    await waitFor(() => expect(total().records).toContain(narrowed));
    expect(nameOf(county("Brașov"))).toBe(mapName); // the map changed with the Total
    // no national authority matches "comuna": its tile is still there, and says nothing was matched
    expect(plain(screen.getByRole("button", { name: new RegExp(`^${t.moneyLensMap.tiles.national}`) }).textContent)).toContain(t.moneyLensMap.tiles.records(0, "0"));
    expect(within(tabs()).getAllByRole("listitem").length).toBeGreaterThan(0);
    // the same query fed all three: nothing else was asked, one request per filter
    expect(asked(sent)).toEqual(['{}', '{"q":"comuna"}']);
    expect(new Set(sent.map((s) => s.operation))).toEqual(new Set(["MainScreen"]));
  });
});

describe("a county click and the side toggle", () => {
  it("filter the Total, the map and the tabs, and the URL carries them (replace history); clicking again takes the county back", async () => {
    const before = window.history.length;
    const { sent } = open("/explore/");
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toBe("18 Records"));

    await user.click(county("Brașov"));
    await waitFor(() => expect(here()).toBe("/explore/?county=RO-BV"));
    await waitFor(() => expect(total()).toEqual({ awarded: "RON 8,000", records: "8 Records" }));
    expect(screen.getByRole("tabpanel")).not.toHaveTextContent("COMUNA I.L. CARAGIALE"); // an authority of Cluj

    await user.click(screen.getByRole("button", { name: "Suppliers" }));
    await waitFor(() => expect(here()).toBe("/explore/?county=RO-BV&countySide=supplier"));
    await waitFor(() => expect(total()).toEqual({ awarded: "RON 19,500", records: "16 Records" }));
    expect(screen.getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Authorities" }));
    await user.click(county("Brașov")); // chosen already: a second click takes it back
    await waitFor(() => expect(here()).toBe("/explore/"));
    await waitFor(() => expect(total().records).toBe("18 Records"));
    expect(window.history.length).toBe(before); // every change replaced the entry
    expect(asked(sent)).toEqual(['{}', '{"county":"RO-BV"}', '{"county":"RO-BV","countySide":"SUPPLIER"}', '{"county":"RO-BV"}', '{}']);
  });

  it("survive a reload: the URL alone restores the county, the side, the Total and the open tab", async () => {
    const first = open("/explore/?county=RO-BV&countySide=supplier&tab=authorities");
    await waitFor(() => expect(total()).toEqual({ awarded: "RON 19,500", records: "16 Records" }));
    first.unmount();

    // a new page load at the same URL
    const url = here();
    expect(url).toBe("/explore/?county=RO-BV&countySide=supplier&tab=authorities");
    open(url);
    await waitFor(() => expect(total()).toEqual({ awarded: "RON 19,500", records: "16 Records" }));
    expect(county("Brașov")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("tab", { name: /^Authorities/ })).toHaveAttribute("aria-selected", "true");
  });

  it("choose an off-map tile as the county, and the side toggle drops a tile the other side does not have", async () => {
    open("/explore/");
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toBe("18 Records"));
    await user.click(screen.getByRole("button", { name: /^Unplaced authorities/ }));
    await waitFor(() => expect(here()).toBe("/explore/?county=UNPLACED"));
    await user.click(screen.getByRole("button", { name: "Suppliers" }));
    await waitFor(() => expect(here()).toBe("/explore/?countySide=supplier")); // no unplaced authorities on the supplier side
    await waitFor(() => expect(total().records).toBe("18 Records"));
    expect(screen.getByRole("button", { name: /^Unknown supplier county/ })).toBeVisible();
  });

  it("work in Romanian at /ro/explore/", async () => {
    open("/ro/explore/");
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toBe("18 înregistrări"));
    await user.click(county("Brașov"));
    await waitFor(() => expect(here()).toBe("/ro/explore/?county=RO-BV"));
    await user.click(screen.getByRole("button", { name: "Furnizori" }));
    await waitFor(() => expect(here()).toBe("/ro/explore/?county=RO-BV&countySide=supplier"));
    await waitFor(() => expect(total()).toEqual({ awarded: "19.500 RON", records: "16 înregistrări" }));
  });
});

describe("the map lens", () => {
  it("is in the URL when it is not Money, and survives a reload", async () => {
    const first = open("/explore/");
    const user = userEvent.setup();
    await waitFor(() => expect(total().records).toBe("18 Records"));
    await user.click(screen.getByRole("button", { name: "Coverage" }));
    await waitFor(() => expect(here()).toBe("/explore/?lens=coverage"));
    first.unmount();
    open(here());
    expect(await screen.findByRole("button", { name: "Coverage" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Money" }));
    await waitFor(() => expect(here()).toBe("/explore/")); // the default is left out
  });
});

describe("a map that cannot be drawn", () => {
  it("says so, and the Total and the tabs still show", async () => {
    openAt("/explore/");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={async () => Promise.reject(new Error("no outlines"))} />);
    expect(await screen.findByText(catalogue.en.main.mapUnavailable)).toBeVisible();
    await waitFor(() => expect(total().records).toBe("18 Records"));
  });
});
