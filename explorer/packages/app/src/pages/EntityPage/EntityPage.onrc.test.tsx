// Seam 3 for the ONRC section (#175): the entity pages rendered from the API's recorded answers over `archive-onrc` (recorded/EntityOverview.json).
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string, waitFor: string | RegExp = /^(ONRC registration|Înmatriculare ONRC)$/) {
  openAt(url);
  const { client } = fixtureClient();
  render(<App client={client} />);
  return within(await screen.findByRole("region", { name: waitFor }));
}

describe("the ONRC section on an entity page", () => {
  it("shows a supplier's registration, its statuses with the snapshot they were first seen in, CAEN codes and seat, each citing its snapshot", async () => {
    const section = await opened("/explore/supplier/3100020");
    expect(screen.getByRole("heading", { level: 1, name: "ALFA ONRC SRL" })).toBeVisible();
    expect(section.getByText("J40/1001/2015")).toBeVisible();
    expect(section.getByText("10 March 2015")).toBeVisible();
    expect(section.getByText("first seen in the snapshot of 3 April 2026")).toBeVisible();
    expect(section.getByText("since at least the snapshot of 18 March 2025")).toBeVisible();
    expect(section.getByText(/ONRC publishes statuses without dates/)).toBeVisible();
    expect(section.getByText("4211")).toBeVisible();
    expect(section.getByText(/Cluj-Napoca, Str\. EXEMPLU/)).toBeVisible();
    expect(section.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme-06-05-2026");
    expect(screen.getByRole("heading", { name: "Signals (2)" })).toBeVisible(); // the SEAP Overview is still there beneath it, with the two insolvency Signals (#184: ALFA is in insolvency now and has Records in the six months up to the snapshot)
  });

  it("shows it on an authority page", async () => {
    const section = await opened("/explore/authority/3100012");
    expect(section.getByText("J03/1006/1995")).toBeVisible();
    expect(section.getByText("2 February 1995")).toBeVisible();
  });

  it.each(["authority", "supplier"])("shows the same section on the %s page of an entity that is both", async (role) => {
    const section = await opened(`/explore/${role}/3100063`);
    expect(section.getByText("J40/1005/2008")).toBeVisible();
    expect(section.getByText("14 May 2008")).toBeVisible();
  });

  it("keeps ANAF's name as the page name and lists ONRC's names as dated aliases", async () => {
    const section = await opened("/explore/supplier/3100039");
    expect(screen.getByRole("heading", { level: 1, name: "BETA ONRC SRL" })).toBeVisible();
    expect(section.getByText("BETA NOU SRL")).toBeVisible();
    expect(section.getByText("BETA VECHI SRL")).toBeVisible();
    expect(section.getByText(/legal name today/)).toBeVisible();
  });

  it("badges a CUI that ANAF does not know and ONRC lists", async () => {
    await opened("/explore/supplier/3100055");
    expect(screen.getByRole("heading", { level: 1, name: "DELTA ONRC SRL" })).toBeVisible();
    expect(screen.getByText("CUI in ONRC only")).toBeVisible();
    expect(screen.queryByText("CUI in ONRC only", { selector: "section *" })).toBeNull();
  });

  it("gives an organisation that exists only in ONRC a page with its section, a note that no person is shown and no SEAP figures", async () => {
    const section = await opened("/explore/supplier/3100071");
    expect(screen.getByRole("heading", { level: 1, name: "OMEGA ONLY SRL" })).toBeVisible();
    expect(screen.getByText("CUI in ONRC only")).toBeVisible();
    expect(section.getByText(/No person of it is shown/)).toBeVisible();
    expect(screen.getByText("This entity has no Records as a supplier.")).toBeVisible();
    expect(screen.queryByRole("list", { name: /Headline numbers/ })).toBeNull();
  });

  it("is in Romanian under /ro/ and keeps ONRC's words as published", async () => {
    const section = await opened("/ro/explore/supplier/3100020");
    expect(section.getByText("văzută prima oară în extrasul din 3 aprilie 2026")).toBeVisible();
    expect(section.getByText("insolvență")).toBeVisible();
    expect(section.getByText(/ONRC publică stările fără date/)).toBeVisible();
  });
});
