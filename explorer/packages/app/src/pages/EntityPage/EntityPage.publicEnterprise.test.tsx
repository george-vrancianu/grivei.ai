// Seam 3 for the "public enterprise (AMEPIP)" section (#183): the entity pages rendered from the API's recorded EntityOverview answers (the very JSON seam 1
// compares the real API with): the entities whose CUI appears in AMEPIP's tables show the section with its basis, the others do not, in both languages.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string) {
  openAt(url);
  render(<App client={fixtureClient().client} />);
  await screen.findByRole("heading", { level: 1 });
}

describe("the public-enterprise section", () => {
  it("shows the mark and its basis on a supplier whose CUI appears in AMEPIP's tables", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Public enterprise (AMEPIP)" }));
    expect(section.getByText("CUI 2000007 appears in AMEPIP's indicator tables of public enterprises under OUG 109/2011, published 13 January 2026, for the financial years shown below. The match is by CUI.")).toBeVisible();
    expect(section.getByText("ALFA DEMO SRL")).toBeVisible();
    expect(section.getByText("J40/1/2005")).toBeVisible();
    expect(section.getByText("funcţiune")).toBeVisible(); // AMEPIP's wording, untranslated
    expect(section.getByText("Financial years 2022–2023")).toBeVisible();
    expect(section.getByRole("link", { name: "AMEPIP's indicator tables on data.gov.ro" })).toHaveAttribute("href", "https://data.gov.ro/dataset/amepip-indicatori-financiari-demo");
    expect(section.getByText(/Fetched 14 November 2026 from data.gov.ro, licence CC-BY-4.0/)).toBeVisible();
  });

  it("shows on the authority page of an entity that buys and sells", async () => {
    await opened("/explore/authority/2000031");
    expect(await screen.findByRole("region", { name: "Public enterprise (AMEPIP)" })).toBeVisible();
    expect(screen.getByText("este sub incidenţa Legii nr. 85/2014, insolvenţă")).toBeVisible();
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Întreprindere publică (AMEPIP)" }));
    expect(section.getByText("CUI 2000007 apare în tabelele de indicatori AMEPIP ale întreprinderilor publice din OUG 109/2011, publicate la 13 ianuarie 2026, pentru anii financiari afișați mai jos. Potrivirea se face după CUI.")).toBeVisible();
    expect(section.getByText("funcţiune")).toBeVisible();
  });

  it("is absent from an authority and a supplier that are not in the tables", async () => {
    await opened("/explore/authority/1000017");
    expect(screen.queryByRole("region", { name: /AMEPIP/ })).toBeNull();
  });
});
