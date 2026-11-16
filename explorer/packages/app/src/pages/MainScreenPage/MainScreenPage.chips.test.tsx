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
// While a menu is open the rest of the page is aria-hidden, the buttons included.
const menuButton = (group: string) => screen.getByRole("button", { name: new RegExp(`^${group}`), hidden: true });

describe("the filter chips on the main screen", () => {
  it("shows no chip on for the plain URL, and offers the procedures the API listed", async () => {
    // the hand-written `records-variety` fixture: the recorded runs have no procedure facet (the API serves it for one entity's set only)
    await opened("/explore/?q=contract");
    expect(within(chips()).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    // nothing is set, so there is no active strip at all
    expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
    // the procedures are items of the Procedure menu
    await userEvent.setup().click(await screen.findByRole("button", { name: /^Procedure/ }));
    expect(await screen.findByRole("menuitemcheckbox", { name: "Licitație deschisă", checked: false })).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Achiziție directă", checked: false })).toBeVisible();
  });

  it("opens with the chips a URL names switched on, and lists them as active", async () => {
    await opened("/explore/?from=2023-01-01&to=2024-12-31&channel=direct-purchase&valueBucket=up-to-270k&hasSignals=true&procedure=Achizi%C8%9Bie%20direct%C4%83&badges=no-value&badges=suspect-value");
    expect(menuButton("Award year")).toHaveTextContent("Award year 2023–2024");
    // Channel and Value are menus: their buttons show the choice, and the menu checks it
    expect(within(chips()).getByRole("button", { name: /^Channel/ })).toHaveTextContent("Channel Direct purchase");
    expect(within(chips()).getByRole("button", { name: /^Value/ })).toHaveTextContent("Value 135,060–270,120 RON");
    expect(within(chips()).getByRole("button", { name: "Has Signals", pressed: true })).toBeVisible();
    expect(menuButton("Procedure")).toHaveTextContent("Procedure Achiziție directă");
    expect(menuButton("Badges")).toHaveTextContent("Badges 2 picked");
    const active = within(screen.getByRole("group", { name: "Active filters" }));
    expect(active.getAllByRole("button")).toHaveLength(9); // 8 chips + Clear all
    expect(active.getByRole("button", { name: "Remove From 2023" })).toBeVisible();
    const user = userEvent.setup();
    await user.click(within(chips()).getByRole("button", { name: /^Channel/ }));
    expect(screen.getByRole("menuitemradio", { name: "Direct purchase", checked: true })).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await user.click(menuButton("Badges"));
    expect(screen.getByRole("menuitemcheckbox", { name: "No value", checked: true })).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Suspect value", checked: true })).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Consortium share", checked: false })).toBeVisible();
  });

  it("shows the chips in Romanian at /ro/explore/", async () => {
    openAt("/ro/explore/?channel=contract&hasSignals=false&from=2023-01-01&badges=no-value&badges=suspect-value");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const bar = await screen.findByRole("region", { name: "Filtre" });
    const channel = within(bar).getByRole("button", { name: /^Canal/ });
    expect(channel).toHaveTextContent("Canal Contract");
    expect(within(bar).getByRole("button", { name: /^Valoare ?Oricare$/ })).toHaveTextContent("Valoare Oricare");
    expect(within(bar).getByRole("button", { name: /^Anul atribuirii/ })).toHaveTextContent("Anul atribuirii din 2023");
    expect(within(bar).getByRole("button", { name: /^Insigne/ })).toHaveTextContent("Insigne 2 alese");
    expect(within(bar).getByRole("button", { name: /^Procedură/ })).toHaveTextContent("Procedură Oricare");
    await userEvent.setup().click(channel);
    expect(screen.getByRole("menuitemradio", { name: "Contract", checked: true })).toBeVisible();
    await userEvent.setup().keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(channel).toHaveFocus();
    expect(channel).toHaveAttribute("aria-expanded", "false");
    expect(within(bar).getByRole("button", { name: "Elimină Fără Semnale" })).toBeVisible();
  });

  it.each([
    ["has Signals", { name: "Has Signals" }, "hasSignals", "true"],
  ])("clicking %s writes it to the URL, replacing the history entry", async (_label, button, key, value) => {
    await opened("/explore/");
    const before = window.history.length;
    await userEvent.setup().click(within(chips()).getByRole("button", button));
    await waitFor(() => expect(queryOf().getAll(key)).toEqual([value]));
    expect(window.history.length).toBe(before);
    expect(within(chips()).getByRole("button", { ...button, pressed: true })).toBeVisible();
  });

  it("picking a badge in the Badges menu writes it to the URL, keeps the menu open, and shows the pick on the button", async () => {
    await opened("/explore/");
    const before = window.history.length;
    const user = userEvent.setup();
    await user.click(within(chips()).getByRole("button", { name: /^Badges/ }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Consortium share" }));
    await waitFor(() => expect(queryOf().getAll("badges")).toEqual(["consortium-share"]));
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("menu")).toBeVisible();
    expect(screen.getByRole("menuitemcheckbox", { name: "Consortium share", checked: true })).toBeVisible();
    expect(menuButton("Badges")).toHaveTextContent("Badges Consortium share");
    await user.click(screen.getByRole("menuitemcheckbox", { name: "No value" }));
    await waitFor(() => expect(queryOf().getAll("badges")).toEqual(["consortium-share", "no-value"]));
    expect(menuButton("Badges")).toHaveTextContent("Badges 2 picked");
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Consortium share", checked: true }));
    await waitFor(() => expect(queryOf().getAll("badges")).toEqual(["no-value"]));
  });

  it.each([
    ["Contract", "Channel", "contract", "Contract", "channel"],
    ["Direct purchase", "Channel", "direct-purchase", "Direct purchase", "channel"],
    ["Over 1 bn RON", "Value", "over-1b", "Over 1 bn RON", "valueBucket"],
  ])("picking %s in the %s menu writes it to the URL, replacing the history entry, and shows it on the button", async (item, group, value, shown, key) => {
    await opened("/explore/");
    const before = window.history.length;
    const user = userEvent.setup();
    const button = within(chips()).getByRole("button", { name: new RegExp(`^${group}`) });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("menuitemradio", { name: item }));
    await waitFor(() => expect(queryOf().getAll(key)).toEqual([value]));
    expect(window.history.length).toBe(before);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(button).toHaveTextContent(`${group} ${shown}`);
    // picking the chosen item again clears it
    await user.click(button);
    await user.click(screen.getByRole("menuitemradio", { name: item, checked: true }));
    await waitFor(() => expect(queryOf().has(key)).toBe(false));
  });

  it("writes years as Jan 1 and Dec 31, and procedures as published", async () => {
    await opened("/explore/?q=contract"); // see above: the hand-written fixture that lists procedures
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Award year/ }));
    await user.click(screen.getByRole("menuitemradio", { name: "From year 2022" }));
    await user.click(screen.getByRole("menuitemradio", { name: "To year 2024" }));
    expect(screen.getByRole("menu")).toBeVisible(); // the year menu stays open while picking
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await user.click(await screen.findByRole("button", { name: /^Procedure/ }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Negociere fără publicare prealabilă" }));
    await waitFor(() =>
      expect(filterInUrl()).toEqual({ q: "contract", from: "2022-01-01", to: "2024-12-31", procedure: ["Negociere fără publicare prealabilă"] }),
    );
  });

  it("round-trips every chip field: URL -> chips -> URL", async () => {
    await opened("/explore/?channel=contract&county=RO-BV&q=pod");
    const user = userEvent.setup();
    await user.click(within(chips()).getByRole("button", { name: /^Value/ }));
    await user.click(screen.getByRole("menuitemradio", { name: "900,400–9,004,000 RON" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await user.click(within(chips()).getByRole("button", { name: /^Badges/ }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "No value" }));
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
    const user = userEvent.setup();
    await user.click(within(chips()).getByRole("button", { name: /^Channel/ }));
    await user.click(screen.getByRole("menuitemradio", { name: "Contract" }));
    await waitFor(() => expect(queryOf().has("channel")).toBe(true));
    expect(queryOf().has("page")).toBe(false);
    expect(queryOf().get("tab")).toBe("records");
  });
});
