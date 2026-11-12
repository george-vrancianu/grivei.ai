// Seam 3 for the entity pages: the app rendered against the contract's fixtures (recorded from the API where there are recorded ones).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { createClient } from "../../graphql/client.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

// The tab-navigation tests walk Overview -> Records on one entity: 30000001 is the hand-written fixture whose Records tab exists (until #87
// records it); the Relationships tab walks recorded ALFA (2000007). Header and Overview behaviour of recorded entities is in EntityPage.overview.test.tsx.
const SUPPLIER = "/explore/supplier/30000001";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}
const tabs = () => within(screen.getByRole("navigation", { name: /Sections of this page|Secțiunile paginii/ }));
const currentTab = () => tabs().getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent);

describe("an entity page", () => {
  it("opens a supplier on the Overview tab, with its header", async () => {
    const sent = open(SUPPLIER);
    expect(await screen.findByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." })).toBeInTheDocument();
    expect(screen.getByText("30000001")).toBeInTheDocument();
    expect(currentTab()).toEqual(["Overview"]);
    expect(await screen.findByRole("list", { name: "Headline numbers" })).toBeInTheDocument();
    expect(sent.map((s) => s.operation)).toEqual(["EntityOverview"]);
    expect(sent[0]).toMatchObject({ variables: { key: "30000001", role: "SUPPLIER", filter: {} } });
  });

  it.each([
    ["/records", "Records", "EntityRecords"],
  ])("opens the %s URL on its own tab, running that tab's operation", async (suffix, name, operation) => {
    const sent = open(`${SUPPLIER}${suffix}`);
    expect(await screen.findByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." })).toBeInTheDocument();
    expect(currentTab()).toEqual([name]);
    expect(sent.map((s) => s.operation)).toEqual([operation]);
  });

  it("opens the /relationships URL on its own tab, running that tab's operation (a recorded entity: ALFA)", async () => {
    const sent = open("/explore/supplier/2000007/relationships");
    expect(await screen.findByRole("heading", { level: 1, name: "ALFA DEMO SRL" })).toBeInTheDocument();
    expect(currentTab()).toEqual(["Relationships"]);
    expect(sent.map((s) => s.operation)).toEqual(["EntityRelationships"]);
  });

  it("gives each tab its own URL and follows a click without a page load", async () => {
    open(SUPPLIER);
    await screen.findByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." });
    expect(tabs().getByRole("link", { name: "Records" })).toHaveAttribute("href", `${SUPPLIER}/records`);
    expect(tabs().getByRole("link", { name: "Relationships" })).toHaveAttribute("href", `${SUPPLIER}/relationships`);

    await userEvent.setup().click(tabs().getByRole("link", { name: "Records" }));
    expect(window.location.pathname).toBe(`${SUPPLIER}/records`);
    expect(await screen.findByRole("heading", { level: 2, name: "Records" })).toBeInTheDocument();
    expect(currentTab()).toEqual(["Records"]);
  });

  it("keeps the header and the tabs on screen while the next tab loads", async () => {
    openAt(SUPPLIER);
    const { client } = fixtureClient();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    let held = false;
    const slow: GraphqlClient = {
      query: async (op, variables, options) => {
        if (held) await gate;
        return client.query(op, variables, options);
      },
    };
    render(<App client={slow} />);
    await screen.findByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." });

    held = true;
    const user = userEvent.setup();
    await user.click(tabs().getByRole("link", { name: "Records" }));
    expect(screen.getByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." })).toBeInTheDocument();
    expect(currentTab()).toEqual(["Records"]);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByRole("heading", { level: 2, name: "Records" })).toBeNull();

    release();
    expect(await screen.findByRole("heading", { level: 2, name: "Records" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reaches every tab link with the Tab key", async () => {
    open(SUPPLIER);
    await screen.findByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." });
    const user = userEvent.setup();
    const reached: (string | null)[] = [];
    for (let i = 0; i < 20 && reached.length < 3; i++) {
      await user.tab();
      const el = document.activeElement;
      if (el && tabs().queryAllByRole("link").includes(el as HTMLElement)) reached.push(el.textContent);
    }
    expect(reached).toEqual(["Overview", "Records", "Relationships"]);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("carries the filter from tab to tab", async () => {
    open("/explore/authority/1000017?from=2023-02-01");
    await screen.findByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" });
    expect(tabs().getByRole("link", { name: "Records" })).toHaveAttribute("href", "/explore/authority/1000017/records?from=2023-02-01");
    expect(tabs().getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/explore/authority/1000017?from=2023-02-01");
  });

  it("offers the role switch to an entity that both buys and sells, linking to the other role's page", async () => {
    open("/explore/authority/2000031");
    await screen.findByRole("heading", { level: 1, name: "CNAIR DEMO SA" });
    const nav = screen.getByRole("navigation", { name: "View as" });
    expect(within(nav).getByRole("link", { name: "As authority" })).toHaveAttribute("aria-current", "page");
    const other = within(nav).getByRole("link", { name: "As supplier" });
    expect(other).toHaveAttribute("href", "/explore/supplier/2000031");

    await userEvent.setup().click(other);
    expect(window.location.pathname).toBe("/explore/supplier/2000031");
    expect(await screen.findByRole("navigation", { name: "View as" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "As supplier" })).toHaveAttribute("aria-current", "page");
  });

  it("shows no role switch for an entity that only buys", async () => {
    open("/explore/authority/1000017");
    await screen.findByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" });
    expect(screen.queryByRole("navigation", { name: "View as" })).not.toBeInTheDocument();
  });

  it("says a name-only supplier is identified by name only", async () => {
    open("/explore/supplier/vat-bg103029862");
    expect(await screen.findByRole("heading", { level: 1, name: "BALKAN DEMO OOD" })).toBeInTheDocument();
    expect(screen.getByText("Identified by name only")).toBeInTheDocument();
    expect(screen.getByText("BG103029862")).toBeInTheDocument();
  });

  it("shows Unplaced for an authority no Source places", async () => {
    open("/explore/authority/51000900");
    await screen.findByRole("heading", { level: 1, name: "ASOCIATIA FARA ADRESA" });
    expect(screen.getByText("Unplaced")).toBeInTheDocument();
  });

  it("is in Romanian under /ro/explore/", async () => {
    open("/ro/explore/authority/1000017?from=2023-02-01");
    expect(await screen.findByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeInTheDocument();
    expect(currentTab()).toEqual(["Prezentare generală"]);
    expect(tabs().getByRole("link", { name: "Înregistrări" })).toHaveAttribute("href", "/ro/explore/authority/1000017/records?from=2023-02-01");
    expect(await screen.findByRole("list", { name: "Cifre principale" })).toBeInTheDocument();
  });

  it("says so when no entity has that key", async () => {
    open("/explore/supplier/name-nobody-has-this-key");
    expect(await screen.findByRole("heading", { level: 1, name: "Entity not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the main screen" })).toHaveAttribute("href", "/explore/");
  });

  it("says so when the data could not be loaded", async () => {
    openAt(SUPPLIER);
    render(<App client={createClient({ fetch: async () => Response.json({ errors: [{ message: "down" }] }, { status: 400 }) })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The data could not be loaded.");
  });
});
