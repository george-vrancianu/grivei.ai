// Seam 3 for a Record's Party (#180): the Record page rendered from the API's recorded answers, in both languages.
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

describe("a Record's Party", () => {
  it("shows the list of the mandate in force with its basis", async () => {
    await opened("/explore/record/DA95000002");
    const section = within(await screen.findByRole("region", { name: "Party" }));
    expect(section.getByText("PARTIDUL NAȚIONAL LIBERAL")).toBeVisible();
    expect(section.getByText("AEP final minutes, election of 9 June 2024")).toBeVisible();
  });

  it("says an independent is not a party", async () => {
    await opened("/explore/record/DA95000008");
    expect(await screen.findByText(/Independent \(not a party\) · AEP final minutes/)).toBeVisible();
  });

  it("states how a subordinate body inherits it, in Romanian", async () => {
    await opened("/ro/explore/record/DA95000003");
    const section = within(await screen.findByRole("region", { name: "Partid" }));
    expect(section.getByText(/^Prin /)).toHaveTextContent("Prin MUNICIPIUL BRASOV, ordonator principal de credite, lista MF din 1 decembrie 2026; relație de finanțare, legătură actuală.");
    expect(section.getByRole("link", { name: "MUNICIPIUL BRASOV" })).toHaveAttribute("href", "/ro/explore/authority/51000501");
  });

  it("shows no Party for a Record in the handover window", async () => {
    await opened("/explore/record/DA95000001");
    expect(screen.queryByRole("region", { name: "Party" })).toBeNull();
  });
});
