// Seam 3 for the has-Signals chip, end to end (story 10): the chip, the URL, the API's recorded answers for `hasSignals: true` and `false`
// (recorded/signals/, archive-signals) and the tabs, the totals and the full-results view that honour it. EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
  await screen.findByRole("tablist");
  return sent;
}
const tabNames = () => screen.getAllByRole("tab").map((t) => t.textContent);
const chips = (name: string) => screen.getByRole("region", { name });

describe("the has-Signals chip on the main screen", () => {
  it("asks the API for the Records in a Signal and counts them everywhere: totals, tabs, active chips", async () => {
    const sent = await opened("/explore/?hasSignals=true");
    expect(sent.filter((s) => s.operation === "MainScreen").map((s) => s.variables)).toEqual([{ filter: { hasSignals: true } }]);
    expect(within(chips("Filters")).getByRole("button", { name: "Has Signals", pressed: true })).toBeVisible();
    expect(within(screen.getByRole("group", { name: "Active filters" })).getByRole("button", { name: "Remove Has Signals" })).toBeVisible();
    await waitFor(() => expect(tabNames()).toEqual(["Authorities 3", "Suppliers 4", "Records 14"]));
    expect(screen.getByText("14 Records", { selector: "*" })).toBeVisible();
  });

  it("asks for the Records outside every Signal when the chip is set to without Signals", async () => {
    const sent = await opened("/explore/?hasSignals=false");
    expect(sent.filter((s) => s.operation === "MainScreen").map((s) => s.variables)).toEqual([{ filter: { hasSignals: false } }]);
    expect(within(chips("Filters")).getByRole("button", { name: "Remove Without Signals" })).toBeVisible();
    await waitFor(() => expect(tabNames()).toEqual(["Authorities 3", "Suppliers 4", "Records 10"]));
  });

  it("turning the chip on writes hasSignals to the URL and narrows the tabs to the Signals' Records", async () => {
    await opened("/explore/?q=");
    const before = tabNames();
    await userEvent.setup().click(within(chips("Filters")).getByRole("button", { name: "Has Signals" }));
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("hasSignals")).toBe("true"));
    await waitFor(() => expect(tabNames()).toEqual(["Authorities 3", "Suppliers 4", "Records 14"]));
    expect(before).not.toEqual(tabNames());
  });

  it("keeps the chip in the full-results view of each tab: the same filter, the same 14 Records, 3 authorities, 4 suppliers", async () => {
    for (const [tab, count] of [["records", "Records 14"], ["authorities", "Authorities 3"], ["suppliers", "Suppliers 4"]] as const) {
      document.body.innerHTML = "";
      openAt(`/explore/search?hasSignals=true&tab=${tab}`);
      const { client, sent } = fixtureClient();
      const { unmount } = render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
      await waitFor(() => expect(sent.length).toBeGreaterThan(0));
      const variables = sent.find((s) => s.operation.startsWith("FullResults"))!.variables as { filter: unknown; limit: number; offset: number };
      expect(variables).toMatchObject({ filter: { hasSignals: true }, limit: 50, offset: 0 });
      expect(await screen.findByRole("heading", { name: count })).toBeVisible();
      unmount();
    }
  });

  it("says it in Romanian under /ro/", async () => {
    openAt("/ro/explore/?hasSignals=true");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("tablist");
    expect(within(chips("Filtre")).getByRole("button", { name: "Are Semnale", pressed: true })).toBeVisible();
    await waitFor(() => expect(tabNames()).toEqual(["Autorități 3", "Furnizori 4", "Înregistrări 14"]));
  });
});
