// Seam 3 for the Overview tab: the widgets are views of the EntityOverview response.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  await screen.findByRole("list", { name: /^(Headline numbers|Cifre principale)$/ });
  return sent;
}

describe("the Overview tab", () => {
  it("shows an authority's headline numbers, counterparties with their share, the empty Signals and the largest counted Records", async () => {
    const sent = await opened("/explore/authority/4000001");
    expect(sent.map((s) => s.operation)).toEqual(["EntityOverview"]);
    const headline = within(screen.getByRole("list", { name: "Headline numbers" }));
    expect(headline.getByText("RON 2,800,000")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Signals (0)" })).toBeVisible();
    expect(screen.getByText("No Signals for this entity.")).toBeVisible();
    const counterparties = within(screen.getByRole("region", { name: "Counterparties" }));
    expect(counterparties.getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
    expect(counterparties.getByText("100%")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Largest Records" })).getByRole("link", { name: "Deszăpezire străzi, sezon rece 2023-2024" })).toHaveAttribute(
      "href",
      "/explore/record/DA12345678",
    );
    // the header and the tabs are on screen
    expect(screen.getByRole("heading", { level: 1, name: "MUNICIPIUL BRAȘOV" })).toBeVisible();
  });

  it("shows a supplier's consortium, aliases (one flagged) and the Signals count", async () => {
    await opened("/explore/supplier/30000001");
    expect(screen.getByRole("heading", { name: "Signals (2)" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Consortia" })).toBeVisible();
    const aliases = within(screen.getByRole("region", { name: "Appears in SEAP as" }));
    expect(aliases.getAllByRole("listitem")).toHaveLength(3);
    expect(aliases.getAllByText("Name differs from ANAF")).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: "Counterparties" })).getByRole("link", { name: "MUNICIPIUL BRAȘOV" })).toHaveAttribute("href", "/explore/authority/4000001");
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/authority/4000001");
    expect(screen.getByRole("heading", { name: "Semnale (0)" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Cele mai mari înregistrări" })).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Contraparți" })).getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute(
      "href",
      "/ro/explore/supplier/30000001",
    );
  });
});
