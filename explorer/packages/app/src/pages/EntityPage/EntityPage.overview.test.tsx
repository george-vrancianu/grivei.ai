// Seam 3 for the Overview tab: the entity pages rendered from the API's recorded answers (`@grivei/contract` recorded/EntityOverview.json,
// the very JSON seam 1 compares the real API with). The widgets are views of the EntityOverview response.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const HEADLINE = /^(Headline numbers|Cifre principale)$/;

async function opened(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  await screen.findByRole("list", { name: HEADLINE });
  return sent;
}
const headline = () => within(screen.getByRole("list", { name: HEADLINE }));
const region = (name: string) => within(screen.getByRole("region", { name }));

describe("an authority page from the API", () => {
  const AUTHORITY = "/explore/authority/1000017";

  it("shows the header, the headline numbers, counterparties with their share, the empty Signals and the largest counted Records", async () => {
    const sent = await opened(AUTHORITY);
    expect(sent.map((s) => s.operation)).toEqual(["EntityOverview"]);
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "AUTHORITY", filter: {} } });
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
    expect(screen.getByText("1000017")).toBeVisible();
    expect(screen.getByText("Unplaced")).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "View as" })).toBeNull(); // it never won a Record
    // 8,840,000 RON counted; a suspect value, two blanks and a framework ceiling are left out and said so
    expect(headline().getByText("RON 8,840,000")).toBeVisible();
    expect(headline().getByRole("link", { name: "1 suspect value left out" })).toBeVisible();
    expect(headline().getByText("The largest holds 62.5% of the total")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Signals (0)" })).toBeVisible();
    expect(screen.getByText("No Signals for this entity.")).toBeVisible();

    const counterparties = region("Counterparties");
    expect(counterparties.getByRole("link", { name: "ALFA DEMO SRL" })).toHaveAttribute("href", "/explore/supplier/2000007");
    expect(counterparties.getByRole("link", { name: "CNAIR DEMO SA" })).toHaveAttribute("href", "/explore/supplier/2000031");
    expect(counterparties.getByText("Persoană fizică")).toBeVisible(); // one row, never named, never linked
    expect(counterparties.getAllByRole("listitem")).toHaveLength(5);
    expect(region("Largest Records").getByRole("link", { name: "Contract CAN9600001 2" })).toHaveAttribute("href", "/explore/record/CAN9600001~2");
    expect(screen.getByRole("region", { name: "Consortia" })).toBeVisible();
  });

  it("is in Romanian under /ro/", async () => {
    await opened(`/ro${AUTHORITY}`);
    expect(screen.getByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
    expect(headline().getByText(/^8\.840\.000\sRON$/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Semnale (0)" })).toBeVisible();
    expect(region("Contraparți").getByRole("link", { name: "ALFA DEMO SRL" })).toHaveAttribute("href", "/ro/explore/supplier/2000007");
    expect(region("Contraparți").getByText("Persoană fizică")).toBeVisible();
    expect(screen.getByRole("region", { name: "Cele mai mari înregistrări" })).toBeVisible();
  });

  it("shows an authority placed in a county and a UAT, and a national one", async () => {
    await opened("/explore/authority/51000005");
    expect(screen.getByText("Sânpetru, Brașov")).toBeVisible();
    expect(region("Consortia").getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("carries the URL's filter into the request, and every number follows it", async () => {
    const sent = await opened(`${AUTHORITY}?from=2023-02-01`);
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "AUTHORITY", filter: { from: "2023-02-01" } } });
    expect(headline().getByText("RON 1,720,000")).toBeVisible();
  });

  it("says so when the filter matches none of its Records", async () => {
    await opened(`${AUTHORITY}?from=2019-01-01&to=2019-12-31`);
    expect(screen.getByText("No counterparties in this selection.")).toBeVisible();
    expect(screen.getByText("No procedures in this selection.")).toBeVisible();
    expect(screen.getByText("No counted Records in this selection.")).toBeVisible();
  });
});

describe("a supplier page from the API", () => {
  const SUPPLIER = "/explore/supplier/2000007";

  it("shows what the supplier won: its own share of each Record, its consortia and the authorities it sold to", async () => {
    const sent = await opened(SUPPLIER);
    expect(sent[0]).toMatchObject({ variables: { key: "2000007", role: "SUPPLIER", filter: {} } });
    expect(screen.getByRole("heading", { level: 1, name: "ALFA DEMO SRL" })).toBeVisible();
    expect(screen.getByText("2000007")).toBeVisible();
    expect(screen.queryByText("Identified by name only")).toBeNull();
    expect(headline().getByText("RON 5,915,000")).toBeVisible();
    expect(headline().getByText("The largest holds 93.4% of the total")).toBeVisible();
    expect(screen.getByRole("region", { name: "Consortia" })).toBeVisible();
    expect(region("Counterparties").getByRole("link", { name: "SPITALUL EXEMPLU" })).toHaveAttribute("href", "/explore/authority/1000017");
    expect(region("Appears in SEAP as").getAllByRole("listitem")).toHaveLength(1);
  });

  it("is in Romanian under /ro/", async () => {
    await opened(`/ro${SUPPLIER}`);
    expect(screen.getByRole("heading", { level: 1, name: "ALFA DEMO SRL" })).toBeVisible();
    expect(headline().getByText(/^5\.915\.000\sRON$/)).toBeVisible();
    expect(region("Contraparți").getByRole("link", { name: "SPITALUL EXEMPLU" })).toHaveAttribute("href", "/ro/explore/authority/1000017");
  });

  it("shows the Signals count of a supplier whose Records are in Signals, in the order the URL asks for", async () => {
    const sent = await opened(`${SUPPLIER}?signalOrder=date-desc`);
    expect(sent[0]).toMatchObject({ variables: { key: "2000007", role: "SUPPLIER", filter: {}, signalOrder: "DATE_DESC" } });
    expect(screen.getByRole("heading", { name: "Signals (6)" })).toBeVisible();
    expect(screen.queryByText("No Signals for this entity.")).toBeNull();
  });
});

describe("an entity with both roles", () => {
  it("shows each role's page with that role's numbers, and switches between them", async () => {
    await opened("/explore/authority/2000031");
    expect(screen.getByRole("heading", { level: 1, name: "CNAIR DEMO SA" })).toBeVisible();
    expect(headline().getByText("RON 340,000")).toBeVisible(); // what it bought
    expect(region("Counterparties").getByRole("link", { name: "BETA DEMO SRL" })).toHaveAttribute("href", "/explore/supplier/2000015");
    const nav = screen.getByRole("navigation", { name: "View as" });
    expect(within(nav).getByRole("link", { name: "As authority" })).toHaveAttribute("aria-current", "page");
    const other = within(nav).getByRole("link", { name: "As supplier" });
    expect(other).toHaveAttribute("href", "/explore/supplier/2000031");

    await userEvent.setup().click(other);
    expect(window.location.pathname).toBe("/explore/supplier/2000031");
    expect(await within(await screen.findByRole("list", { name: HEADLINE })).findByText("RON 2,020,000")).toBeVisible(); // what it won
    expect(screen.getByRole("link", { name: "As supplier" })).toHaveAttribute("aria-current", "page");
    expect(region("Counterparties").getByRole("link", { name: "SPITALUL EXEMPLU" })).toHaveAttribute("href", "/explore/authority/1000017");
    expect(screen.queryByText("RON 340,000")).toBeNull();
  });

  it("is in Romanian under /ro/, the switch included", async () => {
    await opened("/ro/explore/supplier/2000031");
    expect(headline().getByText(/^2\.020\.000\sRON$/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ca autoritate" })).toHaveAttribute("href", "/ro/explore/authority/2000031");
    expect(screen.getByRole("link", { name: "Ca furnizor" })).toHaveAttribute("aria-current", "page");
  });
});

describe("a name-only supplier from the API", () => {
  it("is keyed by name, has no CUI, and its numbers are the same kind of numbers", async () => {
    const sent = await opened("/explore/supplier/name-furnizor-local-srl");
    expect(sent[0]).toMatchObject({ variables: { key: "name-furnizor-local-srl", role: "SUPPLIER" } });
    expect(screen.getByRole("heading", { level: 1, name: "FURNIZOR LOCAL SRL" })).toBeVisible();
    expect(screen.getByText("Identified by name only")).toBeVisible();
    expect(screen.queryByText("CUI")).toBeNull();
    expect(headline().getByText("RON 20,000")).toBeVisible();
    expect(region("Counterparties").getByRole("link", { name: "COMUNA EXEMPLU" })).toHaveAttribute("href", "/explore/authority/1000009");
  });

  it("shows a foreign VAT id as the identifier", async () => {
    await opened("/explore/supplier/vat-bg103029862");
    expect(screen.getByRole("heading", { level: 1, name: "BALKAN DEMO OOD" })).toBeVisible();
    expect(screen.getByText("Foreign VAT ID")).toBeVisible();
    expect(screen.getByText("BG103029862")).toBeVisible();
    expect(screen.getByText("Name and status from SEAP, fetched 15 September 2023")).toBeVisible();
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/supplier/name-furnizor-local-srl");
    expect(screen.getByText("Identificat doar după denumire")).toBeVisible();
    expect(headline().getByText(/^20\.000\sRON$/)).toBeVisible();
  });
});

describe("an entity without the role the URL asks for", () => {
  it("keeps the header and says it has no Records in that role", async () => {
    openAt("/explore/supplier/1000017");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1, name: "SPITALUL EXEMPLU" })).toBeVisible();
    expect(await screen.findByText("This entity has no Records as a supplier.")).toBeVisible();
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "SUPPLIER" } });
    expect(screen.queryByRole("list", { name: HEADLINE })).toBeNull();
  });

  it("says it in Romanian", async () => {
    openAt("/ro/explore/authority/2000007");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1, name: "ALFA DEMO SRL" })).toBeVisible();
    expect(await screen.findByText(/Această entitate nu are Înregistrări ca autoritate contractantă\./)).toBeVisible();
  });
});

describe("an unknown key", () => {
  it("says no entity has that key, in both languages", async () => {
    openAt("/explore/supplier/name-nobody-has-this-key");
    const { client } = fixtureClient();
    const { unmount } = render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Entity not found" })).toBeVisible();
    unmount();
    openAt("/ro/explore/supplier/name-nobody-has-this-key");
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Entitate negăsită|nu a fost găsit/i);
  });
});
