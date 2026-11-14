// Seam 3 for the Records tab's Source switch (#178): SEAP Records or ONRC registrations, each with its own filter in the URL; a Source with nothing for the entity shows nothing.
// The entity is the recorded ALFA DEMO SRL (2000007); the ONRC answers are test-local, built from the contract's ONRC fixture rows under that CUI.
import { fixtures } from "@grivei/contract/fixtures";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient, type ExtraFixture } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { decodeOnrcScreen } from "../../urlState/onrcScreen.ts";

afterEach(() => openAt("/"));

const CUI = "2000007";
const typical = fixtures.OnrcSearch.find((f) => f.name === "typical-name-and-alias-hits")!.data;
const [alfa, beta] = typical.onrc.search.organisations.rows as [(typeof typical.onrc.search.organisations.rows)[number], (typeof typical.onrc.search.organisations.rows)[number]];

/** What ONRC lists for a search by this CUI: the entity's registration, and one that merely starts with the same digits (the search is by prefix). */
const answer = (rows: unknown[]) => ({ onrc: { search: { ...typical.onrc.search, count: rows.length, organisations: { count: rows.length, rows } } } });
const registration = { ...alfa, cui: CUI, name: "ALFA DEMO SRL", registrationNumber: "J40/777/2015", entity: null, matched: [] };
const lookalike = { ...beta, cui: `${CUI}9`, name: "ALTA FIRMA SRL", registrationNumber: "J40/778/2015", entity: null, matched: [] };
const ask = (filter: object): Pick<ExtraFixture, "operation" | "variables"> => ({ operation: "OnrcSearch", variables: { filter: { ...filter, q: CUI }, limit: 50, offset: 0 } });

const withOnrc: ExtraFixture[] = [
  { ...ask({}), data: answer([registration, lookalike]) },
  { ...ask({ status: [1107] }), data: answer([registration]) },
  { ...ask({ status: [1084] }), data: answer([]) },
];

function open(url: string, extra: ExtraFixture[] = withOnrc, hold?: { operation: string; until: Promise<void> }) {
  openAt(url);
  const fixture = fixtureClient({ extra, hold });
  render(<App client={fixture.client} />);
  return fixture;
}
const here = () => `${window.location.pathname}${window.location.search}`;

describe.each([
  { base: "/explore", c: catalogue.en },
  { base: "/ro/explore", c: catalogue.ro },
] as const)("the Records tab's Source switch at $base", ({ base, c }) => {
  const s = c.sources;
  const URL = `${base}/supplier/${CUI}/records`;
  const facets = () => screen.queryByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
  /** The ONRC lookup was sent and answered (or failed): what "no switch" is asserted after. */
  const lookedUp = async (sent: { operation: string }[]) => {
    await waitFor(() => expect(sent.some((r) => r.operation === "OnrcSearch")).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 60));
  };
  const switchGroup = () => within(screen.getByRole("group", { name: s.recordsSwitch.label }));

  it("opens the existing URL on SEAP Records and offers ONRC registrations beside it, since ONRC lists the entity", async () => {
    const { sent } = open(URL);
    await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
    await screen.findByRole("group", { name: s.recordsSwitch.label });
    expect(switchGroup().getByRole("button", { name: s.recordsSwitch.options.SEAP, pressed: true })).toBeVisible();
    expect(switchGroup().getByRole("button", { name: s.recordsSwitch.options.ONRC, pressed: false })).toBeVisible();
    expect(here()).toBe(URL);
    // the entity's SEAP Records as before, and one lookup of ONRC by its CUI
    expect(sent.filter((r) => r.operation === "EntityRecords")).toHaveLength(1);
    expect(sent.filter((r) => r.operation === "OnrcSearch").map((r) => r.variables)).toEqual([{ filter: { q: CUI }, limit: 50, offset: 0 }]);
  });

  it("switches to the registrations: the entity's own, not a look-alike CUI's, with ONRC's chips and its own filter in the URL", async () => {
    open(URL);
    await screen.findByRole("group", { name: s.recordsSwitch.label });
    await userEvent.click(switchGroup().getByRole("button", { name: s.recordsSwitch.options.ONRC }));
    expect(here()).toBe(`${URL}?source=onrc`);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") })).toBeVisible();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("ALFA DEMO SRL");
    expect(rows[0]).toHaveTextContent("J40/777/2015");
    expect(screen.queryByText("ALTA FIRMA SRL")).toBeNull();
    expect(facets()).toBeNull(); // SEAP's facet panel is not ONRC's
    expect(switchGroup().getByRole("button", { name: s.recordsSwitch.options.ONRC, pressed: true })).toBeVisible();
    expect(screen.getByRole("group", { name: s.onrc.filterChips.status.group })).toBeVisible();
  });

  it("keeps ONRC's filter in the URL and applies it, and a filter that leaves nothing says so", async () => {
    open(`${URL}?source=onrc`);
    await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") });
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.status.options[1107]!, pressed: false }));
    await waitFor(() => expect(window.location.search).toBe("?status=1107&source=onrc"));
    expect(decodeOnrcScreen(window.location.search).filter).toEqual({ status: [1107] });
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.status.options[1107]!, pressed: true }));
    await userEvent.click(screen.getByRole("button", { name: s.onrc.filterChips.status.options[1084]!, pressed: false }));
    await waitFor(() => expect(window.location.search).toBe("?status=1084&source=onrc"));
    expect(await screen.findByText(s.onrc.registrations.noMatch)).toBeVisible();
    // the Source still has something for the entity: the switch is still offered
    expect(switchGroup().getByRole("button", { name: s.recordsSwitch.options.SEAP })).toBeVisible();
  });

  it("opens a citable ONRC filter straight from the URL", async () => {
    open(`${URL}?status=1107&source=onrc`);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") })).toBeVisible();
    expect(screen.getByRole("button", { name: s.onrc.filterChips.status.options[1107]!, pressed: true })).toBeVisible();
  });

  it("goes back to SEAP Records unfiltered, with no Source in the URL, and a SEAP filter lives in the URL of that Source", async () => {
    open(`${URL}?status=1107&source=onrc`);
    await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") });
    await userEvent.click(switchGroup().getByRole("button", { name: s.recordsSwitch.options.SEAP }));
    expect(here()).toBe(URL);
    expect(await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ })).toBeVisible();
  });

  it("reads a SEAP filter in the URL as SEAP's: ONRC is not offered a county or a query as a chip there", async () => {
    const { sent } = open(`${URL}?channel=contract`);
    await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
    await lookedUp(sent);
    expect(sent.filter((r) => r.operation === "OnrcSearch")).toHaveLength(1); // the CUI lookup only: a SEAP chip is never an ONRC one
    expect(sent.find((r) => r.operation === "EntityRecords")?.variables).toMatchObject({ filter: { channel: "CONTRACT" } });
  });

  it("shows no switch, and nothing of ONRC, for an entity ONRC lists nothing under", async () => {
    const { sent } = open(URL, [{ ...ask({}), data: answer([lookalike]) }]);
    await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
    await lookedUp(sent);
    expect(screen.queryByRole("group", { name: s.recordsSwitch.label })).toBeNull();
    expect(screen.queryByRole("group", { name: s.onrc.filterChips.status.group })).toBeNull();
  });

  it("shows no switch when the ONRC lookup fails, and the SEAP Records as before", async () => {
    const { sent } = open(URL, []);
    await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
    await lookedUp(sent);
    expect(screen.queryByRole("group", { name: s.recordsSwitch.label })).toBeNull();
  });

  it("does not show ONRC's registrations on the plain Records URL while SEAP's Records are still loading, then shows SEAP's with the switch", async () => {
    let release!: () => void;
    const until = new Promise<void>((resolve) => (release = resolve));
    const { sent } = open(`${base}/supplier/${CUI}`, withOnrc, { operation: "EntityRecords", until });
    await screen.findByRole("heading", { level: 1, name: /ALFA DEMO SRL/ });
    await userEvent.click(within(screen.getByRole("navigation", { name: c.entityPage.layout.label })).getByRole("link", { name: new RegExp(`^${c.entityPage.layout.tabs.records}`) }));
    // ONRC has answered (it has this entity) while SEAP's Records are still out: nothing of ONRC shows, and no switch yet
    await waitFor(() => expect(sent.some((r) => r.operation === "OnrcSearch")).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(sent.some((r) => r.operation === "EntityRecords")).toBe(true);
    expect(screen.queryByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") })).toBeNull();
    expect(screen.queryByText("J40/777/2015")).toBeNull();
    expect(screen.queryByRole("group", { name: s.recordsSwitch.label })).toBeNull();
    release();
    await screen.findByRole("group", { name: s.recordsSwitch.label });
    expect(switchGroup().getByRole("button", { name: s.recordsSwitch.options.SEAP, pressed: true })).toBeVisible();
    expect(screen.queryByText("J40/777/2015")).toBeNull();
  });

  it("asks ONRC for nothing on the other tabs", async () => {
    const { sent } = open(`${base}/supplier/${CUI}/relationships`);
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    expect(sent.some((r) => r.operation === "OnrcSearch")).toBe(false);
  });

  it("opens the ONRC side on an entity with no SEAP Records in the role: the registrations, no switch, nothing of SEAP", async () => {
    // SPITALUL EXEMPLU (1000017) is an authority only: its supplier page has no Records in that role (a recorded answer), but ONRC lists it
    const asked = { operation: "OnrcSearch", variables: { filter: { q: "1000017" }, limit: 50, offset: 0 }, data: answer([{ ...registration, cui: "1000017", name: "SPITALUL EXEMPLU", registrationNumber: "J12/1/1995" }]) };
    const { sent } = open(`${base}/supplier/1000017/records?source=onrc`, [asked]);
    expect(await screen.findByRole("heading", { level: 2, name: s.onrc.results.heading(1, "1") })).toBeVisible();
    expect(screen.getByRole("listitem")).toHaveTextContent("SPITALUL EXEMPLU");
    expect(screen.queryByRole("group", { name: s.recordsSwitch.label })).toBeNull();
    expect(sent.some((r) => r.operation === "OnrcSearch")).toBe(true);
  });

  it("opens that entity's Records tab without the ONRC side as the page said before: no Records in the role, no switch", async () => {
    const asked = { operation: "OnrcSearch", variables: { filter: { q: "1000017" }, limit: 50, offset: 0 }, data: answer([]) };
    const { sent } = open(`${base}/supplier/1000017/records`, [asked]);
    await lookedUp(sent);
    expect(await screen.findByText(c.entityPage.recordsNoRole.supplier)).toBeVisible();
    expect(screen.queryByRole("group", { name: s.recordsSwitch.label })).toBeNull();
  });
});
