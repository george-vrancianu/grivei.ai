import type { RecordFilter } from "@grivei/contract";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { FilterChips } from "./index.ts";

const copy = sampleCopy.filterChips("en");
const PROCEDURES = ["Achiziție directă", "Licitație deschisă"];
// fields the chips do not own: they must come back untouched
const OTHERS: RecordFilter = { q: "pod", county: "RO-BV", uat: "12345", authority: "4000001", supplier: "30000001", cpv: "301", signal: "SPLITTING", countySide: "SUPPLIER" };

const PARTIES = ["PARTIDUL SOCIAL DEMOCRAT", "ALIANȚA USR PLUS"];

function setup(filter: RecordFilter = {}, extra: { lastYear?: number; firstYear?: number; partyOptions?: readonly string[] } = {}) {
  const onChange = vi.fn();
  renderInUi(<FilterChips filter={filter} onChange={onChange} procedureOptions={PROCEDURES} partyOptions={PARTIES} lastYear={2025} locale="en" copy={copy} {...extra} />);
  return onChange;
}
const bar = () => screen.getByRole("region", { name: "Filters" });
// While a menu is open the rest of the page is aria-hidden, the buttons included.
const menuButton = (group: string) => screen.getByRole("button", { name: new RegExp(`^${group}`), hidden: true });
const openMenu = (group: string) => userEvent.click(menuButton(group));
const active = () => within(screen.getByRole("group", { name: "Active filters" }));

describe("FilterChips: what the reader sees", () => {
  it("shows no chip on, and no active strip, for an empty filter", () => {
    setup();
    expect(bar()).toBeVisible();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
  });

  it("reflects a filter: pressed switch, years, and one removable chip per value", () => {
    setup({ from: "2023-01-01", to: "2024-12-31", channel: "CONTRACT", valueBucket: "UP_TO_900K", hasSignals: true, procedure: ["Licitație deschisă"], badges: ["NO_VALUE"] });
    expect(menuButton("Award year")).toHaveTextContent("Award year 2023–2024");
    expect(menuButton("Channel")).toHaveTextContent("Channel Contract");
    expect(menuButton("Value")).toHaveTextContent("Value 270,120–900,400 RON");
    expect(screen.getByRole("button", { name: "Has Signals", pressed: true })).toBeVisible();
    expect(menuButton("Procedure")).toHaveTextContent("Procedure Licitație deschisă");
    expect(menuButton("Badges")).toHaveTextContent("Badges No value");
    for (const name of ["From 2023", "Until 2024", "Contract", "270,120–900,400 RON", "Has Signals", "Licitație deschisă", "No value"]) {
      expect(active().getByRole("button", { name: `Remove ${name}` })).toBeVisible();
    }
  });

  it("shows a given hasSignals=false as an active 'Without Signals' chip, with the switch off", () => {
    setup({ hasSignals: false });
    expect(screen.getByRole("button", { name: "Has Signals", pressed: false })).toBeVisible();
    expect(active().getByRole("button", { name: "Remove Without Signals" })).toBeVisible();
  });

  it("shows dates that are not year edges as dates in the active chips", () => {
    setup({ from: "2024-03-15", to: "2024-09-30" });
    expect(active().getByRole("button", { name: "Remove From 15 Mar 2024" })).toBeVisible();
    expect(active().getByRole("button", { name: /^Remove Until 30 Sep/ })).toBeVisible();
  });

  it("offers a procedure the filter holds even when the caller did not list it", async () => {
    setup({ procedure: ["Procedură simplificată"] });
    expect(menuButton("Procedure")).toHaveTextContent("Procedure Procedură simplificată");
    await openMenu("Procedure");
    expect(screen.getByRole("menuitemcheckbox", { name: "Procedură simplificată", checked: true })).toBeVisible();
  });

  it("offers every value bucket and every badge", async () => {
    setup();
    await openMenu("Badges");
    expect(screen.getAllByRole("menuitemcheckbox")).toHaveLength(RECORD_BADGES.length);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await openMenu("Value");
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(7);
  });

  it("puts the Signals switch first, ahead of the menus", () => {
    setup();
    const [first, second] = within(screen.getByTestId("filter-bar-scroller")).getAllByRole("button");
    expect(first).toHaveTextContent("Has Signals");
    expect(second).toHaveTextContent("Award year");
  });

  it("sets a divider between the Signals switch and the menus", () => {
    setup();
    const [first, divider, second] = Array.from(screen.getByTestId("filter-bar-scroller").children);
    expect(first).toHaveTextContent("Has Signals");
    expect(divider).toBe(screen.getByTestId("filter-bar-divider"));
    expect(divider).toHaveAttribute("aria-hidden", "true");
    expect(second).toHaveTextContent("Award year");
  });

  it("is reachable by keyboard", async () => {
    const onChange = setup();
    await userEvent.tab(); // the Signals switch
    await userEvent.tab(); // the Award year menu button
    await userEvent.tab(); // the Channel menu button
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}"); // the first item takes focus
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ channel: "DIRECT_PURCHASE" });
  });
});

describe("FilterChips: the Party filter (#181)", () => {
  it("offers the lists as registered in a single-choice menu, none chosen", async () => {
    setup();
    expect(menuButton("Party")).toHaveTextContent("Party Any");
    await openMenu("Party");
    expect(screen.getAllByRole("menuitemradio").map((o) => o.textContent)).toEqual(PARTIES);
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull();
  });

  it("picking a list sets only the party; picking it again unsets it", async () => {
    const onChange = setup(OTHERS);
    await openMenu("Party");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "ALIANȚA USR PLUS" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, party: "ALIANȚA USR PLUS" });
    cleanup();
    const again = setup({ ...OTHERS, party: "ALIANȚA USR PLUS" });
    await openMenu("Party");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "ALIANȚA USR PLUS", checked: true }));
    expect(again).toHaveBeenLastCalledWith(OTHERS);
  });

  it("shows the chosen list on its button and as an active chip that removes only itself", async () => {
    const onChange = setup({ ...OTHERS, party: "PARTIDUL SOCIAL DEMOCRAT" });
    expect(menuButton("Party")).toHaveTextContent("Party PARTIDUL SOCIAL DEMOCRAT");
    await userEvent.click(active().getByRole("button", { name: "Remove Party: PARTIDUL SOCIAL DEMOCRAT" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
  });

  it("is absent when the graph offers no list (no AEP), unless the URL holds one", () => {
    setup({}, { partyOptions: [] });
    expect(screen.queryByRole("button", { name: /^Party/ })).toBeNull();
    cleanup();
    setup({ party: "PARTIDUL UNIC" }, { partyOptions: [] });
    expect(menuButton("Party")).toHaveTextContent("Party PARTIDUL UNIC");
  });
});

describe("FilterChips: each chip emits the whole next filter", () => {
  it("picking a from-year sets Jan 1; a to-year sets Dec 31; either end can stand alone", async () => {
    const onChange = setup(OTHERS);
    await openMenu("Award year");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "From year 2022" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, from: "2022-01-01" });
    await userEvent.click(screen.getByRole("menuitemradio", { name: "To year 2024" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, to: "2024-12-31" });
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("choosing Any on a year end unsets it and keeps the other end", async () => {
    const onChange = setup({ from: "2022-01-01", to: "2024-12-31" });
    await openMenu("Award year");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "From year Any" }));
    expect(onChange).toHaveBeenLastCalledWith({ to: "2024-12-31" });
    await userEvent.click(screen.getByRole("menuitemradio", { name: "To year Any" }));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2022-01-01" });
  });

  it("honours the year bounds from the caller", async () => {
    setup({}, { firstYear: 2023, lastYear: 2024 });
    await openMenu("Award year");
    const items = screen.getAllByRole("menuitemradio").map((o) => o.getAttribute("aria-label"));
    expect(items).toEqual(["From year Any", "From year 2023", "From year 2024", "To year Any", "To year 2023", "To year 2024"]);
  });

  it("shows Any on the Channel and Value buttons, and the chosen value once set", () => {
    setup();
    expect(menuButton("Channel")).toHaveTextContent("Channel Any");
    expect(menuButton("Value")).toHaveTextContent("Value Any");
    cleanup();
    setup({ channel: "CONTRACT", valueBucket: "OVER_1B" });
    expect(menuButton("Channel")).toHaveTextContent("Channel Contract");
    expect(menuButton("Value")).toHaveTextContent("Value Over 1 bn RON");
  });

  it.each([["Direct purchase", "DIRECT_PURCHASE"], ["Contract", "CONTRACT"]])("the %s item sets the channel", async (name, channel) => {
    const onChange = setup(OTHERS);
    await openMenu("Channel");
    await userEvent.click(screen.getByRole("menuitemradio", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, channel });
  });

  it("choosing the active channel again unsets it, and the other one replaces it", async () => {
    const onChange = setup({ ...OTHERS, channel: "CONTRACT" });
    await openMenu("Channel");
    expect(screen.getByRole("menuitemradio", { name: "Contract", checked: true })).toBeVisible();
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Contract" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
    await openMenu("Channel");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Direct purchase" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, channel: "DIRECT_PURCHASE" });
  });

  it.each([
    ["Up to 10,000 RON", "UP_TO_10K"], ["10,000–135,060 RON", "UP_TO_135K"], ["135,060–270,120 RON", "UP_TO_270K"], ["270,120–900,400 RON", "UP_TO_900K"],
    ["900,400–9,004,000 RON", "UP_TO_9M"], ["9,004,000 RON–1 bn RON", "UP_TO_1B"], ["Over 1 bn RON", "OVER_1B"],
  ])("the %s item sets valueBucket %s", async (name, bucket) => {
    const onChange = setup(OTHERS);
    await openMenu("Value");
    await userEvent.click(screen.getByRole("menuitemradio", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, valueBucket: bucket });
  });

  it("choosing the active value bucket again unsets it", async () => {
    const onChange = setup({ ...OTHERS, valueBucket: "UP_TO_9M" });
    await openMenu("Value");
    await userEvent.click(screen.getByRole("menuitemradio", { name: "900,400–9,004,000 RON", checked: true }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
  });

  it("Has Signals sets true, then unsets; from a given false it sets true", async () => {
    const onChange = setup(OTHERS);
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, hasSignals: true });
  });
  it("Has Signals unsets when on", async () => {
    const onChange = setup({ ...OTHERS, hasSignals: true });
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
  });
  it("Has Signals replaces a given false with true", async () => {
    const onChange = setup({ ...OTHERS, hasSignals: false });
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, hasSignals: true });
  });

  it.each(PROCEDURES)("the %s item adds that procedure to the list", async (name) => {
    const onChange = setup({ ...OTHERS, procedure: ["Procedură simplificată"] });
    await openMenu("Procedure");
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, procedure: ["Procedură simplificată", name] });
  });

  it("toggling the only procedure off leaves the field unset, not []", async () => {
    const onChange = setup({ ...OTHERS, procedure: ["Licitație deschisă"] });
    await openMenu("Procedure");
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Licitație deschisă", checked: true }));
    const next = onChange.mock.lastCall![0] as RecordFilter;
    expect(next).toEqual(OTHERS);
    expect("procedure" in next).toBe(false);
  });

  it("shows the empty Procedure menu's sentence as its only, disabled line", async () => {
    renderInUi(<FilterChips filter={{}} onChange={() => {}} procedureOptions={[]} lastYear={2025} locale="en" copy={copy} />);
    await openMenu("Procedure");
    expect(screen.getByRole("menuitem", { name: "No procedures to choose from." })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
  });

  it("shows the count once several procedures or badges are picked", () => {
    setup({ procedure: PROCEDURES, badges: ["NO_VALUE", "SUSPECT_VALUE", "CRAWL_ONLY"] });
    expect(menuButton("Procedure")).toHaveTextContent("Procedure 2 picked");
    expect(menuButton("Badges")).toHaveTextContent("Badges 3 picked");
  });

  it.each(RECORD_BADGES)("the %s badge item adds that badge, and removes it when on", async (badge) => {
    const label = copy.badges.badges[badge].label;
    const onChange = setup({ ...OTHERS, badges: ["CRAWL_ONLY", "NO_VALUE"].filter((b) => b !== badge) as RecordFilter["badges"] });
    await openMenu("Badges");
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: label, checked: false }));
    expect(onChange.mock.lastCall![0].badges).toContain(badge);
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("toggling an active badge item off removes only that badge", async () => {
    const onChange = setup({ badges: ["NO_VALUE", "SUSPECT_VALUE"] });
    await openMenu("Badges");
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "No value", checked: true }));
    expect(onChange).toHaveBeenLastCalledWith({ badges: ["SUSPECT_VALUE"] });
  });
});

describe("FilterChips: the active chips' remove actions", () => {
  const FULL: RecordFilter = {
    ...OTHERS, from: "2023-01-01", to: "2024-12-31", channel: "CONTRACT", valueBucket: "UP_TO_270K", hasSignals: true,
    procedure: ["Achiziție directă", "Licitație deschisă"], badges: ["NO_VALUE", "SUSPECT_VALUE"],
  };
  const without = (...fields: (keyof RecordFilter)[]): RecordFilter => {
    const next = { ...FULL };
    for (const field of fields) delete next[field];
    return next;
  };

  it.each([
    ["From 2023", () => without("from")],
    ["Until 2024", () => without("to")],
    ["Contract", () => without("channel")],
    ["135,060–270,120 RON", () => without("valueBucket")],
    ["Has Signals", () => without("hasSignals")],
    ["Achiziție directă", () => ({ ...FULL, procedure: ["Licitație deschisă"] })],
    ["Licitație deschisă", () => ({ ...FULL, procedure: ["Achiziție directă"] })],
    ["No value", () => ({ ...FULL, badges: ["SUSPECT_VALUE"] })],
    ["Suspect value", () => ({ ...FULL, badges: ["NO_VALUE"] })],
  ])("Remove %s emits the filter without it", async (name, expected) => {
    const onChange = setup(FULL);
    await userEvent.click(active().getByRole("button", { name: `Remove ${name}` }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected());
  });

  it("removing the last procedure or badge leaves the field unset", async () => {
    const onChange = setup({ procedure: ["Licitație deschisă"], badges: ["NO_VALUE"] });
    await userEvent.click(active().getByRole("button", { name: "Remove Licitație deschisă" }));
    expect(onChange.mock.lastCall![0]).toEqual({ badges: ["NO_VALUE"] });
    expect("procedure" in onChange.mock.lastCall![0]).toBe(false);
  });

  it("removes a given hasSignals=false", async () => {
    const onChange = setup({ ...OTHERS, hasSignals: false });
    await userEvent.click(active().getByRole("button", { name: "Remove Without Signals" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(OTHERS);
  });

  it("removes a mid-year from-date as a whole", async () => {
    const onChange = setup({ from: "2024-03-15", channel: "CONTRACT" });
    await userEvent.click(active().getByRole("button", { name: "Remove From 15 Mar 2024" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ channel: "CONTRACT" });
  });

  it("Clear all clears only the chips' fields", async () => {
    const onChange = setup(FULL);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(OTHERS);
  });
});
