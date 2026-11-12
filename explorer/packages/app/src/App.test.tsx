// Seam 3: the app rendered against the contract's mock responses. English at /explore/, Romanian at /ro/explore/.
import { render, screen, within } from "@testing-library/react";
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

    const table = screen.getByRole("table", { name: "Records" });
    expect(within(table).getByRole("columnheader", { name: "Supplier" })).toBeInTheDocument();
    const row = within(table).getByRole("row", { name: /CAN1170001/ });
    expect(row).toHaveTextContent("Reabilitare pod peste râul Olt"); // source data, as published
    expect(row).toHaveTextContent("RON 30,000,000");

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

    const table = screen.getByRole("table", { name: "Înregistrări" });
    expect(within(table).getByRole("columnheader", { name: "Furnizor" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /CAN1170001/ })).toHaveTextContent("Reabilitare pod peste râul Olt");
  });

  it("tells the reader when the data could not be loaded", async () => {
    openAt("/explore/");
    const client = createClient({ fetch: async () => Response.json({ errors: [{ message: "down" }] }, { status: 400 }) });
    render(<App client={client} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The data could not be loaded.");
  });
});
