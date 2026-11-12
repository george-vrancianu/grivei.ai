// Seam 3 for the filter chips: the chips and the URL are two views of one RecordFilter.
import type { RecordFilter } from "@grivei/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { decodeUrlState } from "../../urlState/codec.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const queryOf = () => new URLSearchParams(window.location.search);
const filterInUrl = (): RecordFilter => decodeUrlState(window.location.search).filter;
const opened = async (url: string) => {
  openAt(url);
  render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
  return screen.findByRole("region", { name: /^(Filters|Filtre)$/ });
};
const chips = () => screen.getByRole("region", { name: "Filters" });

describe("the filter chips on the main screen", () => {
  it("shows no chip on for the plain URL, and offers the procedures the API listed", async () => {
    // the hand-written `records-variety` fixture: the recorded runs have no procedure facet (the API serves it for one entity's set only)
    await opened("/explore/?q=contract");
    expect(within(chips()).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(await within(chips()).findByRole("button", { name: "Licitație deschisă", pressed: false })).toBeVisible();
    expect(within(chips()).getByRole("button", { name: "Achiziție directă" })).toBeVisible();
  });

  it("opens with the chips a URL names switched on, and lists them as active", async () => {
    await opened("/explore/?from=2023-01-01&to=2024-12-31&channel=direct-purchase&valueBucket=up-to-270k&hasSignals=true&procedure=Achizi%C8%9Bie%20direct%C4%83&badges=no-value&badges=suspect-value");
    expect(screen.getByRole("combobox", { name: "From year" })).toHaveValue("2023");
    expect(screen.getByRole("combobox", { name: "To year" })).toHaveValue("2024");
    for (const name of ["Direct purchase", "135,060–270,120 RON", "Has Signals", "Achiziție directă", "No value", "Suspect value"]) {
      expect(within(chips()).getByRole("button", { name, pressed: true })).toBeVisible();
    }
    const active = within(screen.getByRole("group", { name: "Active filters" }));
    expect(active.getAllByRole("button")).toHaveLength(9); // 8 chips + Clear all
    expect(active.getByRole("button", { name: "Remove From 2023" })).toBeVisible();
  });

  it("shows the chips in Romanian at /ro/explore/", async () => {
    openAt("/ro/explore/?channel=contract&hasSignals=false");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const bar = await screen.findByRole("region", { name: "Filtre" });
    expect(within(bar).getByRole("button", { name: "Contract", pressed: true })).toBeVisible();
    expect(within(bar).getByRole("button", { name: "Elimină Fără Semnale" })).toBeVisible();
  });

  it.each([
    ["the Contract chip", { name: "Contract" }, "channel", "contract"],
    ["the Direct purchase chip", { name: "Direct purchase" }, "channel", "direct-purchase"],
    ["a value bucket", { name: "Over 1 bn RON" }, "valueBucket", "over-1b"],
    ["has Signals", { name: "Has Signals" }, "hasSignals", "true"],
    ["a badge", { name: "Consortium share" }, "badges", "consortium-share"],
  ])("clicking %s writes it to the URL, replacing the history entry", async (_label, button, key, value) => {
    await opened("/explore/");
    const before = window.history.length;
    await userEvent.setup().click(within(chips()).getByRole("button", button));
    await waitFor(() => expect(queryOf().getAll(key)).toEqual([value]));
    expect(window.history.length).toBe(before);
    expect(within(chips()).getByRole("button", { ...button, pressed: true })).toBeVisible();
  });

  it("writes years as Jan 1 and Dec 31, and procedures as published", async () => {
    await opened("/explore/?q=contract"); // see above: the hand-written fixture that lists procedures
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "From year" }), "2022");
    await user.selectOptions(screen.getByRole("combobox", { name: "To year" }), "2024");
    await user.click(await within(chips()).findByRole("button", { name: "Negociere fără publicare prealabilă" }));
    await waitFor(() =>
      expect(filterInUrl()).toEqual({ q: "contract", from: "2022-01-01", to: "2024-12-31", procedure: ["Negociere fără publicare prealabilă"] }),
    );
  });

  it("round-trips every chip field: URL -> chips -> URL", async () => {
    await opened("/explore/?channel=contract&county=RO-BV&q=pod");
    const user = userEvent.setup();
    await user.click(within(chips()).getByRole("button", { name: "900,400–9,004,000 RON" }));
    await user.click(within(chips()).getByRole("button", { name: "No value" }));
    await waitFor(() => expect(filterInUrl()).toEqual({ channel: "CONTRACT", county: "RO-BV", q: "pod", valueBucket: "UP_TO_9M", badges: ["NO_VALUE"] }));
  });

  it("removing a chip drops only it from the URL, and the field disappears when its list empties", async () => {
    await opened("/explore/?channel=contract&badges=no-value&q=pod");
    const user = userEvent.setup();
    const active = within(screen.getByRole("group", { name: "Active filters" }));
    await user.click(active.getByRole("button", { name: "Remove No value" }));
    await waitFor(() => expect(window.location.search).toBe("?q=pod&channel=contract"));
    await user.click(active.getByRole("button", { name: "Remove Contract" }));
    await waitFor(() => expect(window.location.search).toBe("?q=pod"));
  });

  it("Clear all removes the chips' fields and keeps the rest of the URL", async () => {
    await opened("/explore/?q=pod&county=RO-BV&channel=contract&from=2023-01-01&hasSignals=false&tab=records");
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(window.location.search).toBe("?q=pod&county=RO-BV&tab=records"));
  });

  it("changing a chip resets the page", async () => {
    await opened("/explore/?tab=records&page=3");
    await userEvent.setup().click(within(chips()).getByRole("button", { name: "Contract" }));
    await waitFor(() => expect(queryOf().has("channel")).toBe(true));
    expect(queryOf().has("page")).toBe(false);
    expect(queryOf().get("tab")).toBe("records");
  });
});
