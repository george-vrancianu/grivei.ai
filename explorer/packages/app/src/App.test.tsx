// Seam 3: the app rendered against the contract's mock responses. English at /explore/, Romanian at /ro/explore/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { openAt } from "./testing/openAt.ts";
import { App } from "./App.tsx";
import { createClient } from "./graphql/client.ts";
import { fixtureClient } from "./testing/fixtureClient.ts";

describe("the main screen for the empty filter", () => {
  it("shows the Total and the Records in English at /explore/", async () => {
    openAt("/explore/");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Explore public spending" })).toBeInTheDocument();
    expect(await screen.findByTestId("total-awarded")).toHaveTextContent("RON 86,000,000,000");
    expect(screen.getByTestId("total-records")).toHaveTextContent("410,000 Records");

    // Suppliers is the tab that opens when the URL names none
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Suppliers/ });
    expect(within(panel).getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/explore/supplier/30000002");
    expect(panel).toHaveTextContent("RON 1,800,000,000 matched · 320 Records · Cluj");

    // it asked for the empty filter, by persisted id
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ operation: "MainScreen", variables: { filter: {} } });
  });

  it("shows the same data in Romanian at /ro/explore/", async () => {
    openAt("/ro/explore/");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Explorează cheltuielile publice" })).toBeInTheDocument();
    expect(await screen.findByTestId("total-awarded")).toHaveTextContent("86.000.000.000 RON");
    expect(screen.getByTestId("total-records")).toHaveTextContent("410.000 de înregistrări");

    expect(screen.getByRole("tab", { name: /^Furnizori/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Furnizori/ });
    expect(panel).toHaveTextContent("1.800.000.000 RON potrivit · 320 de înregistrări · Cluj");
    expect(within(panel).getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/ro/explore/supplier/30000002");
  });

  it("opens on the Records tab for ?tab=records, with the full value of a consortium Record", async () => {
    openAt("/explore/?tab=records");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByRole("tab", { name: /^Records/ })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /^Records/ });
    expect(within(panel).getByRole("link", { name: "Reabilitare pod peste râul Olt" })).toHaveAttribute("href", "/explore/record/CAN1170001");
    expect(panel).toHaveTextContent("RON 30,000,000");
    expect(within(panel).getByText("consortium")).toBeVisible();
  });

  it("puts the chosen tab in the URL, replacing the history entry, and links entities by locale", async () => {
    openAt("/ro/explore/");
    const before = window.history.length;
    const { client } = fixtureClient();
    render(<App client={client} />);
    await userEvent.setup().click(await screen.findByRole("tab", { name: /^Autorități/ }));
    await waitFor(() => expect(window.location.search).toBe("?tab=authorities"));
    expect(window.history.length).toBe(before);
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: /COMPANIA NAȚIONALĂ/ })).toHaveAttribute("href", "/ro/explore/authority/4000002");
  });

  it("links \"show all\" to the full-results view of the open tab, carrying the language", async () => {
    openAt("/ro/explore/?tab=authorities");
    const { client } = fixtureClient();
    render(<App client={client} />);
    await screen.findByRole("tab", { name: /^Autorități/ });
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: "Arată toate cele 5.100" })).toHaveAttribute("href", "/ro/explore/search?tab=authorities");
  });

  it("links \"show all\" for the default tab without a tab in the URL", async () => {
    openAt("/explore/");
    const { client } = fixtureClient();
    render(<App client={client} />);
    await screen.findByRole("tab", { name: /^Suppliers/ });
    expect(within(screen.getByRole("tabpanel")).getByRole("link", { name: "Show all 41,000" })).toHaveAttribute("href", "/explore/search");
  });

  it("keeps the URL canonical: choosing the default tab (Suppliers) leaves it out of the URL", async () => {
    openAt("/explore/?tab=records");
    const { client } = fixtureClient();
    render(<App client={client} />);
    await userEvent.setup().click(await screen.findByRole("tab", { name: /^Suppliers/ }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(screen.getByRole("tab", { name: /^Suppliers/ })).toHaveAttribute("aria-selected", "true");
  });

  it("tells the reader when the data could not be loaded", async () => {
    openAt("/explore/");
    const client = createClient({ fetch: async () => Response.json({ errors: [{ message: "down" }] }, { status: 400 }) });
    render(<App client={client} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The data could not be loaded.");
  });
});
