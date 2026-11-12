// Seam 3: the app rendered against the contract's fixtures (recorded from seam 1 runs: `recorded/`, with a few hand-written states). English at /explore/, Romanian at /ro/explore/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { readTotal } from "./testing/total.ts";
import { openAt } from "./testing/openAt.ts";
import { App } from "./App.tsx";
import { createClient } from "./graphql/client.ts";
import { loadTestCountyTopology } from "./testing/countyTopology.ts";
import { fixtureClient } from "./testing/fixtureClient.ts";

describe("the main screen for the empty filter", () => {
  it("shows the Total and the Records in English at /explore/", async () => {
    openAt("/explore/");
    const { client, sent } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Explore public spending" })).toBeInTheDocument();
    await screen.findByTestId("main-total");
    expect(readTotal()).toEqual({ awarded: "RON 21,300", records: "18 Records" });

    // Suppliers is the tab that opens when the URL names none
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Suppliers/ });
    expect(within(panel).getByRole("link", { name: "ȘANTIERUL ȚARA DEMO SRL" })).toHaveAttribute("href", "/explore/supplier/2000007");
    expect(panel).toHaveTextContent("RON 19,500 matched · 16 Records · Brașov");

    // it asked for the empty filter, by persisted id
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ operation: "MainScreen", variables: { filter: {} } });
  });

  it("shows the same data in Romanian at /ro/explore/", async () => {
    openAt("/ro/explore/");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Explorează cheltuielile publice" })).toBeInTheDocument();
    await screen.findByTestId("main-total");
    expect(readTotal()).toEqual({ awarded: "21.300 RON", records: "18 înregistrări" });

    expect(screen.getByRole("tab", { name: /^Furnizori/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Furnizori/ });
    expect(panel).toHaveTextContent("19.500 RON potrivit · 16 înregistrări · Brașov");
    expect(within(panel).getByRole("link", { name: "ȘANTIERUL ȚARA DEMO SRL" })).toHaveAttribute("href", "/ro/explore/supplier/2000007");
  });

  it("opens on the Records tab for ?tab=records, with the full value of a consortium Record", async () => {
    openAt("/explore/?tab=records");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);

    expect(await screen.findByRole("tab", { name: /^Records/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Records/ });
    expect(within(panel).getByRole("link", { name: "Drum comunal" })).toHaveAttribute("href", "/explore/record/CAN9800001~1");
    expect(panel).toHaveTextContent("RON 1,000"); // the full value of the Record, not a member's 500 share
    expect(within(panel).getAllByText("consortium")).toHaveLength(3); // the Records with several winners
  });

  it("puts the chosen tab in the URL, replacing the history entry, and links entities by locale", async () => {
    openAt("/ro/explore/");
    const before = window.history.length;
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await userEvent.setup().click(await screen.findByRole("tab", { name: /^Autorități/ }));
    await waitFor(() => expect(window.location.search).toBe("?tab=authorities"));
    expect(window.history.length).toBe(before);
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: /MINISTERUL EXEMPLULUI/ })).toHaveAttribute("href", "/ro/explore/authority/51001000");
  });

  it("links \"show all\" to the full-results view of the open tab, carrying the language", async () => {
    openAt("/ro/explore/?q=ro&tab=authorities"); // a hand-written fixture: the recorded archive has too few rows for a "show all"
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("tab", { name: /^Autorități/ });
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: /^Arată toate cele ≈?66\.000$/ })).toHaveAttribute("href", "/ro/explore/search?q=ro&tab=authorities");
  });

  it("links \"show all\" for the default tab without a tab in the URL", async () => {
    openAt("/explore/?q=ro"); // a hand-written fixture: the recorded archive has too few rows for a "show all"
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("tab", { name: /^Suppliers/ });
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: /^Show all ≈?240,000$/ })).toHaveAttribute("href", "/explore/search?q=ro");
  });

  it("keeps the URL canonical: choosing the default tab (Suppliers) leaves it out of the URL", async () => {
    openAt("/explore/?tab=records");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await userEvent.setup().click(await screen.findByRole("tab", { name: /^Suppliers/ }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveAttribute("aria-selected", "true");
  });

  it("tells the reader when the data could not be loaded", async () => {
    openAt("/explore/");
    const client = createClient({ fetch: async () => Response.json({ errors: [{ message: "down" }] }, { status: 400 }) });
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The data could not be loaded.");
  });
});
