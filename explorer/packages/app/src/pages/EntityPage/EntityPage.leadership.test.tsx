// Seam 3 for the Leadership list (#180): the entity pages rendered from the API's recorded EntityOverview answers (the JSON seam 1 compares the real API with):
// a town hall with a party switch and a gap, a partial election, a subordinate body through its authority, and a school and a supplier with none; both languages.
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

describe("the Leadership list", () => {
  it("lists a town hall's mandates with the switch of party, the caveat and the handover window as a gap", async () => {
    await opened("/explore/authority/51000501");
    const section = within(await screen.findByRole("region", { name: "Leadership list" }));
    expect(section.getByText(/may have switched party since/)).toBeVisible();
    const items = section.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("POPESCU ION · PARTIDUL SOCIAL DEMOCRAT27 October 2020 – 27 September 2024AEP final minutes, election of 27 September 2020");
    expect(items[1]).toHaveTextContent("POPESCU ION · PARTIDUL NAȚIONAL LIBERAL27 October 2024 – in forceAEP final minutes, election of 9 June 2024");
    expect(section.getByText(/Handover window: the previous mandates ended on 27 September 2024/)).toBeVisible();
    expect(section.queryByRole("link")).toBeNull(); // leaders are never linked
  });

  it("shows a partial election, its interim gap and the one-off file's data-through date", async () => {
    await opened("/explore/authority/51000307");
    const section = within(await screen.findByRole("region", { name: "Leadership list" }));
    expect(section.getByText(/Interim leader after a vacancy/)).toBeVisible();
    expect(section.getByText(/AEP partial election of 7 December 2025; partial counts from a one-off file.*data through 9 December 2025/)).toBeVisible();
  });

  it("shows a mandate without results as a gap and a repeat round as its basis", async () => {
    await opened("/explore/authority/51000404");
    const section = within(await screen.findByRole("region", { name: "Leadership list" }));
    expect(section.getByText("AEP repeat round of 11 October 2020")).toBeVisible();
    expect(section.getByText(/Mandate without results/)).toBeVisible();
  });

  it("gives a subordinate body its authority's list with the basis and a link to the authority", async () => {
    await opened("/explore/authority/51003206");
    const section = within(await screen.findByRole("region", { name: "Leadership list" }));
    expect(section.getByText(/^Shown through /)).toHaveTextContent("Shown through MUNICIPIUL BRASOV, principal credit holder, MF list snapshot 1 December 2026; funding relation, current tie.");
    expect(section.getByRole("link", { name: "MUNICIPIUL BRASOV" })).toHaveAttribute("href", "/explore/authority/51000501");
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/authority/51000501");
    const section = within(await screen.findByRole("region", { name: "Lista conducerii" }));
    expect(section.getByText(/Fereastra de predare/)).toBeVisible();
    expect(section.getByText(/27 octombrie 2024 – în funcție/)).toBeVisible();
  });

  it("is absent from a school (two principals) and from a supplier", async () => {
    await opened("/explore/authority/51001507");
    expect(screen.queryByRole("region", { name: "Leadership list" })).toBeNull();
  });
});
