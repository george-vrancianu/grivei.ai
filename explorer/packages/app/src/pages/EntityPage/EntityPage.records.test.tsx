// Seam 3 for the Records tab: the entity pages rendered from the API's recorded answers (`@grivei/contract` recorded/EntityRecords.json,
// the very JSON seam 1 compares the real API with, so the numbers here are the API's). The facet panel, the URL's filter and the
// filtered table are views of one RecordFilter. The estimated total and its second page are hand-written (an archive this small
// cannot give 65,000 Records).
import type { RecordFilter } from "@grivei/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { decodeUrlState } from "../../urlState/codec.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const PANEL = /^(Filter by facet|Filtre pe fațete)$/;
const AUTHORITY = "/explore/authority/1000017/records"; // SPITALUL EXEMPLU: 16 Records
const SUPPLIER = "/explore/supplier/2000007/records"; // ALFA DEMO SRL: 13 Records
const filterInUrl = (): RecordFilter => decodeUrlState(window.location.search).filter;
const panel = () => within(screen.getByRole("complementary", { name: PANEL }));
/** The Records the table lists, by code (their links). */
const listed = () => screen.getAllByRole("link").map((l) => l.getAttribute("href") ?? "").filter((h) => /\/explore\/record\//.test(h)).map((h) => decodeURIComponent(h.split("/").pop()!));

async function opened(url: string) {
  openAt(url);
  const fixture = fixtureClient();
  const view = render(<App client={fixture.client} />);
  await screen.findByRole("complementary", { name: PANEL });
  return { ...fixture, view };
}

describe("the Records tab of an authority", () => {
  it("opens with the facets, the total and the Records of the unfiltered page", async () => {
    const { sent } = await opened(AUTHORITY);
    expect(sent.map((s) => s.operation)).toEqual(["EntityRecords"]);
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "AUTHORITY", filter: {}, limit: 100, offset: 0 } });
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
    expect(screen.getByText("16 Records")).toBeVisible();
    expect(listed()).toHaveLength(16);
    expect(screen.getByRole("link", { name: "Contract CAN9600001 1" })).toHaveAttribute("href", "/explore/record/CAN9600001~1");
    // its suppliers are the counterparties; the facet counts are the API's
    expect(panel().getByRole("button", { name: "ALFA DEMO SRL (11)", pressed: false })).toBeVisible();
    expect(panel().getByRole("button", { name: "Direct purchase (8)" })).toBeVisible();
    expect(panel().getByRole("button", { name: "2023 (15)" })).toBeVisible();
    expect(panel().getByRole("button", { name: /^Suspect value \(1\)/ })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Result pages" })).toBeNull(); // one page
    // natural-person winners are shown as such, and no row links one to an entity page
    expect(screen.getAllByText("Persoană fizică").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("link").filter((l) => /\/explore\/(supplier|authority)\//.test(l.getAttribute("href") ?? "") && /Persoană fizică/.test(l.textContent ?? ""))).toHaveLength(0);
  });

  // every facet kind: what the click writes to the URL, and the total and rows the API answered for exactly that filter
  it.each<[string, string, RecordFilter, number]>([
    ["channel", "Direct purchase (8)", { channel: "DIRECT_PURCHASE" }, 8],
    ["procedure", "Negociere (3)", { procedure: ["Negociere"] }, 3],
    ["year", "2024 (1)", { from: "2024-01-01", to: "2024-12-31" }, 1],
    ["counterparty", "ALFA DEMO SRL (11)", { supplier: "2000007" }, 11],
    ["badge", "Suspect value (1)", { badges: ["SUSPECT_VALUE"] }, 1],
  ])("the %s facet writes the filter to the URL (history replaced) and shows the filtered total and rows", async (_kind, name, expected, count) => {
    await opened(AUTHORITY);
    const before = window.history.length;
    await userEvent.setup().click(panel().getByRole("button", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) }));
    await waitFor(() => expect(filterInUrl()).toEqual(expected));
    expect(window.history.length).toBe(before);
    expect(await screen.findByText(`${count} ${count === 1 ? "Record" : "Records"}`)).toBeVisible();
    expect(listed()).toHaveLength(count);
    expect(panel().getAllByRole("button", { pressed: true }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible(); // the header and the tabs stayed
  });

  it("opens on a Signal's reproducing filter, with the Signal facet on", async () => {
    // archive-signals answers this authority too; `order` tells the two apart (see recordedRecordsCases.ts)
    await opened(`${AUTHORITY}?signal=over-cap&order=value-desc`);
    expect(await screen.findByText("5 Records")).toBeVisible();
    expect(panel().getByRole("button", { name: /^Over cap/, pressed: true })).toBeVisible();
    expect(listed()).toEqual(["DA98000006", "DA98000010", "DA98000001", "DA98000002", "DA98000004"]);
  });

  it("writes a Signal facet to the URL beside the order the URL carries", async () => {
    await opened(`${AUTHORITY}?order=value-desc`);
    expect(await screen.findByText("15 Records")).toBeVisible();
    await userEvent.setup().click(panel().getByRole("button", { name: /^No publication/ }));
    await waitFor(() => expect(window.location.search).toBe("?signal=no-publication&order=value-desc"));
    expect(await screen.findByText("5 Records")).toBeVisible();
  });

  it("clicking the active facet again removes it from the URL", async () => {
    await opened(`${AUTHORITY}?channel=direct-purchase`);
    expect(await screen.findByText("8 Records")).toBeVisible();
    await userEvent.setup().click(panel().getByRole("button", { name: /^Direct purchase/, pressed: true }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByText("16 Records")).toBeVisible();
  });

  it("opens with several facets on, from the URL: they are all pressed and the total is the API's for exactly that filter", async () => {
    await opened(`${AUTHORITY}?from=2023-01-01&to=2023-12-31&channel=contract&supplier=2000007`);
    expect(await screen.findByText("6 Records")).toBeVisible();
    for (const name of [/^Contract/, /^2023/, /^ALFA DEMO SRL/]) expect(panel().getByRole("button", { name, pressed: true })).toBeVisible();
    expect(listed()).toHaveLength(6);
  });

  it("a facet chosen on top of others narrows the set again", async () => {
    await opened(`${AUTHORITY}?from=2023-01-01&to=2023-12-31&channel=contract`);
    expect(await screen.findByText("8 Records")).toBeVisible();
    await userEvent.setup().click(panel().getByRole("button", { name: /^ALFA DEMO SRL/ }));
    await waitFor(() => expect(filterInUrl()).toEqual({ from: "2023-01-01", to: "2023-12-31", channel: "CONTRACT", supplier: "2000007" }));
    expect(await screen.findByText("6 Records")).toBeVisible();
  });

  it("shows the suspect value, counted in no sum, when the badge is on", async () => {
    await opened(`${AUTHORITY}?badges=suspect-value`);
    expect(await screen.findByText("1 Record")).toBeVisible();
    expect(listed()).toEqual(["DA96000005"]);
    expect(screen.getByText("1 suspect value left out")).toBeVisible();
  });

  it("an empty result says so and Clear filters empties the facets in the URL", async () => {
    await opened(`${AUTHORITY}?from=2019-01-01&to=2019-12-31`);
    expect(await screen.findByText("No Records match these filters.")).toBeVisible();
    expect(listed()).toHaveLength(0);
    expect(panel().getByRole("button", { name: "2019", pressed: true })).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByText("16 Records")).toBeVisible();
  });

  it("the suspect-value link of the Overview leads to the Records tab on that badge", async () => {
    openAt("/explore/authority/1000017");
    const { client } = fixtureClient();
    const overview = render(<App client={client} />);
    const link = await screen.findByRole("link", { name: "1 suspect value left out" });
    expect(link).toHaveAttribute("href", `${AUTHORITY}?badges=suspect-value`);
    overview.unmount();
    await opened(link.getAttribute("href")!); // the link is a plain anchor: a page load lands here
    expect(await screen.findByText("1 Record")).toBeVisible();
    expect(panel().getByRole("button", { name: /^Suspect value/, pressed: true })).toBeVisible();
  });
});

describe("the Records tab of a supplier", () => {
  it("lists the supplier's own Records and offers its authorities as the counterparties", async () => {
    const { sent } = await opened(SUPPLIER);
    expect(sent[0]).toMatchObject({ variables: { key: "2000007", role: "SUPPLIER", filter: {}, limit: 100, offset: 0 } });
    expect(screen.getByRole("heading", { level: 1, name: "ALFA DEMO SRL" })).toBeVisible();
    expect(screen.getByText("13 Records")).toBeVisible();
    expect(listed()).toHaveLength(13);
    expect(panel().getByRole("button", { name: "SPITALUL EXEMPLU (11)" })).toBeVisible();
  });

  it("a counterparty facet writes authority, and the filtered Records are the same pair seen from the authority's side", async () => {
    const first = await opened(SUPPLIER);
    await userEvent.setup().click(panel().getByRole("button", { name: /^SPITALUL EXEMPLU/ }));
    await waitFor(() => expect(filterInUrl()).toEqual({ authority: "1000017" }));
    expect(await screen.findByText("11 Records")).toBeVisible();
    const fromTheSupplier = listed();
    expect(fromTheSupplier).toHaveLength(11);
    // the authority's page filtered to this supplier lists the same Records
    first.view.unmount();
    await opened(`${AUTHORITY}?supplier=2000007`);
    expect(await screen.findByText("11 Records")).toBeVisible();
    expect([...listed()].sort()).toEqual([...fromTheSupplier].sort());
  });

  it("is in Romanian at /ro/, with the facets of the filter in the URL", async () => {
    await opened("/ro/explore/supplier/2000007/records?channel=contract");
    expect(await screen.findByText("7 înregistrări")).toBeVisible();
    expect(panel().getByRole("group", { name: "Canal" })).toBeVisible();
    expect(panel().getByRole("group", { name: "Anul atribuirii" })).toBeVisible();
    expect(panel().getByRole("group", { name: "Autoritate contractantă" })).toBeVisible();
    expect(panel().getByRole("button", { name: /^Contract/, pressed: true })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Înregistrări" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Contract CAN9600001 1" })).toHaveAttribute("href", "/ro/explore/record/CAN9600001~1");
  });
});

describe("the Records tab of an entity that buys and sells", () => {
  it("each role's page lists only what the entity did in that role", async () => {
    await opened("/explore/authority/2000031/records");
    expect(screen.getByText("2 Records")).toBeVisible();
    const bought = listed();
    expect(bought).toEqual(["CAN9600007~1", "DA96000007"]);
    expect(screen.getByRole("navigation", { name: "Roles of this entity" })).toBeVisible();

    await userEvent.setup().click(screen.getByRole("link", { name: "sells · supplier" }));
    // the role switch keeps the tab: the Records tab of the supplier page (its Records are the ones it won)
    await waitFor(() => expect(window.location.pathname).toBe("/explore/supplier/2000031/records"));
    await waitFor(() => expect(listed()).toEqual(["CAN9600006~1", "DA96000006"]));
  });

  it("the supplier page lists what it won", async () => {
    await opened("/explore/supplier/2000031/records");
    expect(screen.getByText("2 Records")).toBeVisible();
    expect(listed()).toEqual(["CAN9600006~1", "DA96000006"]);
  });
});

describe("the Records tab of a name-only supplier", () => {
  it("lists its Records all the same, in English and Romanian", async () => {
    const { view } = await opened("/explore/supplier/name-furnizor-local-srl/records");
    expect(screen.getByText("2 Records")).toBeVisible();
    expect(listed()).toEqual(["DA96200001", "DA96200002"]);
    view.unmount();
    await opened("/ro/explore/supplier/name-furnizor-local-srl/records");
    expect(screen.getByText("2 înregistrări")).toBeVisible();
  });

  it("is a counterparty of an authority, picked from the URL", async () => {
    await opened("/explore/authority/1000009/records?supplier=name-furnizor-local-srl");
    expect(await screen.findByText("2 Records")).toBeVisible();
    expect(listed()).toEqual(["DA96200001", "DA96200002"]);
  });
});

describe("the Records tab of an entity that lacks the page's role, or that does not exist", () => {
  it.each([
    ["/explore/supplier/1000017/records", "This entity has no Records as a supplier."],
    ["/ro/explore/supplier/1000017/records", "Această entitate nu are Înregistrări ca furnizor."],
  ])("%s settles on a message instead of loading for ever", async (url, sentence) => {
    openAt(url);
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByText(sentence)).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
  });

  it("says no entity has an unknown key", async () => {
    openAt("/explore/supplier/name-nobody-has-this-key/records");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Entity not found" })).toBeVisible();
  });
});

describe("facet changes survive a reload", () => {
  // The acceptance criterion of #87: a click updates the table and the totals; the URL it leaves behind, opened afresh (a reload, or the
  // link pasted to someone), shows the same filtered table, the same totals and the same facets pressed.
  it("facet changes update the table and totals and survive a reload", async () => {
    const { view } = await opened(AUTHORITY);
    const user = userEvent.setup();
    await user.click(panel().getByRole("button", { name: /^Contract/ }));
    expect(await screen.findByText("8 Records")).toBeVisible();
    await user.click(panel().getByRole("button", { name: /^2023/ }));
    await waitFor(() => expect(filterInUrl()).toEqual({ from: "2023-01-01", to: "2023-12-31", channel: "CONTRACT" }));
    await user.click(panel().getByRole("button", { name: /^ALFA DEMO SRL/ }));
    expect(await screen.findByText("6 Records")).toBeVisible();
    const rows = listed();
    const total = screen.getByText("6 Records").closest("div")?.textContent;
    const cited = `${window.location.pathname}${window.location.search}`;
    expect(cited).toBe(`${AUTHORITY}?from=2023-01-01&to=2023-12-31&channel=contract&supplier=2000007`);
    expect(rows).toHaveLength(6);

    view.unmount(); // the reload: nothing but the URL is left
    const { sent } = await opened(cited);
    expect(await screen.findByText("6 Records")).toBeVisible();
    expect(listed()).toEqual(rows);
    expect(screen.getByText("6 Records").closest("div")?.textContent).toBe(total);
    expect(panel().getByRole("button", { name: /^Contract/, pressed: true })).toBeVisible();
    expect(panel().getByRole("button", { name: /^ALFA DEMO SRL/, pressed: true })).toBeVisible();
    expect(sent.map((s) => s.operation)).toEqual(["EntityRecords"]);
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "AUTHORITY", filter: { from: "2023-01-01", to: "2023-12-31", channel: "CONTRACT", supplier: "2000007" }, offset: 0 } });
  });

  it("survives a reload in Romanian too, and Clear filters goes back to the whole list", async () => {
    const url = "/ro/explore/authority/1000017/records?from=2023-01-01&to=2023-12-31&channel=contract";
    await opened(url);
    expect(await screen.findByText("8 înregistrări")).toBeVisible();
    expect(panel().getByRole("button", { name: /^2023/, pressed: true })).toBeVisible();
    await userEvent.setup().click(panel().getByRole("button", { name: /^Contract/, pressed: true }));
    await waitFor(() => expect(window.location.search).toBe("?from=2023-01-01&to=2023-12-31"));
    expect(await screen.findByText("15 înregistrări")).toBeVisible();
  });
});

describe("a long list (hand-written: the archive is too small for 100 Records)", () => {
  const LONG = "/explore/authority/4000001/records?to=2030-12-31";

  it("shows an estimated total with ≈ and page links", async () => {
    await opened(LONG);
    expect(await screen.findByText(/^≈\s1,240,000 Records$/)).toBeVisible();
    const nav = screen.getByRole("navigation", { name: "Result pages" });
    expect(within(nav).getByRole("link", { name: "Page 2" })).toHaveAttribute("href", `${LONG}&page=2`);
  });

  it("asks for the second page by offset and keeps the page in the URL", async () => {
    const { sent } = await opened(`${LONG}&page=2`);
    expect(sent[0]).toMatchObject({ variables: { key: "4000001", filter: { to: "2030-12-31" }, limit: 100, offset: 100 } });
    const nav = screen.getByRole("navigation", { name: "Result pages" });
    expect(within(nav).getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("a facet change goes back to the first page", async () => {
    const { sent } = await opened(`${LONG}&page=2`);
    await userEvent.setup().click(panel().getByRole("button", { name: /^Contract/ }));
    await waitFor(() => expect(window.location.search).toBe("?to=2030-12-31&channel=contract"));
    // no hand fixture answers the filtered list: the request is what shows the reset
    await waitFor(() => expect(sent.at(-1)).toMatchObject({ variables: { filter: { to: "2030-12-31", channel: "CONTRACT" }, offset: 0 } }));
  });
});
