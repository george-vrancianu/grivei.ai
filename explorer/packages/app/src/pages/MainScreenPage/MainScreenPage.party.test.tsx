// Seam 3 for the Party filter (#181): the chip and the URL are two views of one RecordFilter, and the Total states what the filter covers.
// Runs on the answers recorded from the party archive (contract/src/fixtures/recorded/party/); the hand-written `party-psd` is only the fixture for tests of other screens.
import type { RecordFilter } from "@grivei/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { decodeUrlState } from "../../urlState/codec.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { plain, readTotal } from "../../testing/total.ts";

const PSD = "PARTIDUL SOCIAL DEMOCRAT";
const PNL = "PARTIDUL NAȚIONAL LIBERAL";
const CHANNEL = "channel=direct-purchase"; // the recorded run of the party archive (its answers offer the lists and state the coverage) is asked with this chip
const filterInUrl = (): RecordFilter => decodeUrlState(window.location.search).filter;
const opened = async (url: string, options: Parameters<typeof fixtureClient>[0] = {}) => {
  openAt(url);
  const { client, sent } = fixtureClient(options);
  render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
  await screen.findByRole("region", { name: /^(Filters|Filtre)$/ });
  return sent;
};
const select = () => screen.findByRole("combobox", { name: "List as registered" });

describe("the Party filter on the main screen", () => {
  it("offers the lists the API names, as registered, and writes the one picked to the URL, replacing the history entry", async () => {
    await opened(`/explore/?${CHANNEL}`);
    const before = window.history.length;
    const picker = await select();
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Any party", PNL, PSD, "ALIANȚA USR PLUS",
    ]);
    await userEvent.setup().selectOptions(picker, PSD);
    await waitFor(() => expect(filterInUrl()).toEqual({ channel: "DIRECT_PURCHASE", party: PSD }));
    expect(window.location.search).toBe("?channel=direct-purchase&party=PARTIDUL+SOCIAL+DEMOCRAT");
    expect(window.history.length).toBe(before);
    expect(await select()).toHaveValue(PSD);
  });

  it("opens with the list a URL names chosen, and lists it as an active chip", async () => {
    await opened(`/explore/?${CHANNEL}&party=${encodeURIComponent(PSD)}`);
    expect(await select()).toHaveValue(PSD);
    expect(within(screen.getByRole("group", { name: "Active filters" })).getByRole("button", { name: `Remove Party: ${PSD}` })).toBeVisible();
  });

  it("removing the chip, or choosing Any, drops only the party from the URL", async () => {
    await opened(`/explore/?${CHANNEL}`);
    const user = userEvent.setup();
    await user.selectOptions(await select(), PSD);
    await waitFor(() => expect(filterInUrl().party).toBe(PSD));
    await user.click(within(screen.getByRole("group", { name: "Active filters" })).getByRole("button", { name: `Remove Party: ${PSD}` }));
    await waitFor(() => expect(window.location.search).toBe(`?${CHANNEL}`));
    await user.selectOptions(await select(), PSD);
    await waitFor(() => expect(filterInUrl().party).toBe(PSD));
    await user.selectOptions(await select(), "Any party");
    await waitFor(() => expect(window.location.search).toBe(`?${CHANNEL}`));
  });

  it("Clear all removes the party with the other chips and keeps the rest of the URL", async () => {
    await opened(`/explore/?q=pod&county=RO-BV&party=${encodeURIComponent(PSD)}&channel=contract&tab=records`);
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(window.location.search).toBe("?q=pod&county=RO-BV&tab=records"));
  });

  it("states the coverage beside the Total: direct and subordinate, what the filter leaves out and the unattributed share", async () => {
    await opened(`/explore/?${CHANNEL}&party=${encodeURIComponent(PNL)}`);
    const coverage = await screen.findByTestId("party-coverage");
    await waitFor(() => expect(readTotal().records).toBe("7 Records"));
    expect(readTotal().awarded).toBe("RON 7,000"); // direct + subordinate: 6,000 + 1,000
    const lines = within(coverage).getAllByRole("listitem").map((li) => plain(li.textContent));
    expect(lines).toEqual([
      "Led by this list directly: 6 Records · RON 6,000",
      "Through subordinate bodies: 1 Record · RON 1,000",
      "Led by other lists: 6 Records · RON 6,000",
      "Led by independent leaders (not a party): 2 Records · RON 2,000",
      "Not attributed to a party: 13 Records · RON 13,000",
    ]);
    expect(within(coverage).getByText(/46.5% of the value in this set is not attributed to any party/)).toBeVisible();
    expect(within(coverage).getByRole("link", { name: "How a Party is attributed" })).toHaveAttribute("href", "/explore/methodology#party-and-leadership");
  });

  it("shows no coverage statement without a Party filter", async () => {
    await opened("/explore/");
    await waitFor(() => expect(readTotal().records).not.toBe(""));
    expect(screen.queryByTestId("party-coverage")).toBeNull();
  });

  it("is in Romanian at /ro/explore/, the list as registered unchanged", async () => {
    openAt(`/ro/explore/?${CHANNEL}&party=${encodeURIComponent(PSD)}`);
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const bar = await screen.findByRole("region", { name: "Filtre" });
    expect(await within(bar).findByRole("combobox", { name: "Lista, așa cum a fost înregistrată" })).toHaveValue(PSD);
    expect(within(bar).getByRole("button", { name: `Elimină Partid: ${PSD}` })).toBeVisible();
    const coverage = await screen.findByTestId("party-coverage");
    expect(within(coverage).getByRole("heading", { name: `Acoperire pe partide: ${PSD}` })).toBeVisible();
    expect(within(coverage).getAllByRole("listitem").map((li) => plain(li.textContent).split(":")[0])).toEqual([
      "Conduse direct de această listă", "Prin organisme subordonate", "Conduse de alte liste", "Conduse de lideri independenți (nu sunt partid)", "Neatribuite vreunui partid",
    ]);
    expect(within(coverage).getByText(/din valoarea acestui set nu este atribuită niciunui partid/)).toBeVisible();
  });

  it("shows no Party chip when the graph offers no list (no AEP: a recorded answer has none), and the rest of the screen works", async () => {
    await opened("/explore/");
    await waitFor(() => expect(readTotal().records).not.toBe(""));
    expect(screen.queryByRole("combobox", { name: "List as registered" })).toBeNull();
  });

  it("keeps offering the lists while the next answer loads, so the chip does not blink out on a keystroke", async () => {
    await opened(`/explore/?${CHANNEL}`);
    await select();
    await userEvent.setup().type(screen.getByRole("searchbox"), "x");
    expect(screen.getByRole("combobox", { name: "List as registered" })).toBeVisible();
  });
});
