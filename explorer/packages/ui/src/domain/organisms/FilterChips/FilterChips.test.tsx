import type { RecordFilter } from "@grivei/contract";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RECORD_BADGES } from "../../atoms/BadgeChip/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { FilterChips } from "./index.ts";

const copy = sampleCopy.filterChips("en");
const PROCEDURES = ["Achiziție directă", "Licitație deschisă"];
// fields the chips do not own: they must come back untouched
const OTHERS: RecordFilter = { q: "pod", county: "RO-BV", uat: "12345", authority: "4000001", supplier: "30000001", cpv: "301", signal: "SPLITTING", countySide: "SUPPLIER" };

function setup(filter: RecordFilter = {}, extra: { lastYear?: number; firstYear?: number } = {}) {
  const onChange = vi.fn();
  render(<FilterChips filter={filter} onChange={onChange} procedureOptions={PROCEDURES} lastYear={2025} locale="en" copy={copy} {...extra} />);
  return onChange;
}
const bar = () => screen.getByRole("region", { name: "Filters" });
const active = () => within(screen.getByRole("group", { name: "Active filters" }));

describe("FilterChips: what the reader sees", () => {
  it("shows no chip on, and says so, for an empty filter", () => {
    setup();
    expect(bar()).toBeVisible();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(active().getByText("No filters on.")).toBeVisible();
  });

  it("reflects a filter: pressed toggles, years, and one removable chip per value", () => {
    setup({ from: "2023-01-01", to: "2024-12-31", channel: "CONTRACT", valueBucket: "UP_TO_900K", hasSignals: true, procedure: ["Licitație deschisă"], badges: ["NO_VALUE"] });
    expect(screen.getByRole("combobox", { name: "From year" })).toHaveValue("2023");
    expect(screen.getByRole("combobox", { name: "To year" })).toHaveValue("2024");
    for (const name of ["Contract", "Up to 900,400 RON", "Has Signals", "Licitație deschisă", "No value"]) {
      expect(screen.getByRole("button", { name, pressed: true })).toBeVisible();
    }
    for (const name of ["From 2023", "Until 2024", "Contract", "Up to 900,400 RON", "Has Signals", "Licitație deschisă", "No value"]) {
      expect(active().getByRole("button", { name: `Remove ${name}` })).toBeVisible();
    }
  });

  it("shows a given hasSignals=false as an active 'Without Signals' chip, with the toggle off", () => {
    setup({ hasSignals: false });
    expect(screen.getByRole("button", { name: "Has Signals", pressed: false })).toBeVisible();
    expect(active().getByRole("button", { name: "Remove Without Signals" })).toBeVisible();
  });

  it("shows dates that are not year edges as dates in the active chips", () => {
    setup({ from: "2024-03-15", to: "2024-09-30" });
    expect(active().getByRole("button", { name: "Remove From 15 Mar 2024" })).toBeVisible();
    expect(active().getByRole("button", { name: /^Remove Until 30 Sep/ })).toBeVisible();
  });

  it("offers a procedure the filter holds even when the caller did not list it", () => {
    setup({ procedure: ["Procedură simplificată"] });
    expect(screen.getByRole("button", { name: "Procedură simplificată", pressed: true })).toBeVisible();
  });

  it("offers every value bucket and every badge", () => {
    setup();
    expect(within(screen.getByRole("group", { name: "Value" })).getAllByRole("button")).toHaveLength(7);
    expect(within(screen.getByRole("group", { name: "Record badges" })).getAllByRole("button")).toHaveLength(RECORD_BADGES.length);
  });

  it("is reachable by keyboard", async () => {
    const onChange = setup();
    await userEvent.tab(); // from-year select
    await userEvent.tab(); // to-year select
    await userEvent.tab(); // first channel chip
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ channel: "DIRECT_PURCHASE" });
  });
});

describe("FilterChips: each chip emits the whole next filter", () => {
  it("picking a from-year sets Jan 1; a to-year sets Dec 31; either end can stand alone", async () => {
    const onChange = setup(OTHERS);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "From year" }), "2022");
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, from: "2022-01-01" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "To year" }), "2024");
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, to: "2024-12-31" });
  });

  it("choosing Any on a year end unsets it and keeps the other end", async () => {
    const onChange = setup({ from: "2022-01-01", to: "2024-12-31" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "From year" }), "Any");
    expect(onChange).toHaveBeenLastCalledWith({ to: "2024-12-31" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "To year" }), "Any");
    expect(onChange).toHaveBeenLastCalledWith({ from: "2022-01-01" });
  });

  it("honours the year bounds from the caller", () => {
    setup({}, { firstYear: 2023, lastYear: 2024 });
    const select = screen.getByRole("combobox", { name: "From year" }) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Any", "2023", "2024"]);
  });

  it.each([["Direct purchase", "DIRECT_PURCHASE"], ["Contract", "CONTRACT"]])("the %s chip sets the channel, and clicking it again unsets it", async (name, channel) => {
    const onChange = setup(OTHERS);
    await userEvent.click(screen.getByRole("button", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, channel });
  });

  it("the active channel chip toggles off, and the other one replaces it", async () => {
    const onChange = setup({ ...OTHERS, channel: "CONTRACT" });
    await userEvent.click(within(screen.getByRole("group", { name: "Channel" })).getByRole("button", { name: "Contract" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
    await userEvent.click(screen.getByRole("button", { name: "Direct purchase" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, channel: "DIRECT_PURCHASE" });
  });

  it.each([
    ["Up to 10,000 RON", "UP_TO_10K"], ["Up to 135,060 RON", "UP_TO_135K"], ["Up to 270,120 RON", "UP_TO_270K"], ["Up to 900,400 RON", "UP_TO_900K"],
    ["Up to 9,004,000 RON", "UP_TO_9M"], ["Up to 1 bn RON", "UP_TO_1B"], ["Over 1 bn RON", "OVER_1B"],
  ])("the %s chip sets valueBucket %s", async (name, bucket) => {
    const onChange = setup(OTHERS);
    await userEvent.click(screen.getByRole("button", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, valueBucket: bucket });
  });

  it("choosing the active value bucket again unsets it", async () => {
    const onChange = setup({ ...OTHERS, valueBucket: "UP_TO_9M" });
    await userEvent.click(within(screen.getByRole("group", { name: "Value" })).getByRole("button", { name: "Up to 9,004,000 RON" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
  });

  it("Has Signals sets true, then unsets; from a given false it sets true", async () => {
    const onChange = setup(OTHERS);
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, hasSignals: true });
  });
  it("Has Signals unsets when on", async () => {
    const onChange = setup({ ...OTHERS, hasSignals: true });
    await userEvent.click(within(screen.getByRole("group", { name: "Signals" })).getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith(OTHERS);
  });
  it("Has Signals replaces a given false with true", async () => {
    const onChange = setup({ ...OTHERS, hasSignals: false });
    await userEvent.click(within(screen.getByRole("group", { name: "Signals" })).getByRole("button", { name: "Has Signals" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, hasSignals: true });
  });

  it.each(PROCEDURES)("the %s chip adds that procedure to the list", async (name) => {
    const onChange = setup({ ...OTHERS, procedure: ["Procedură simplificată"] });
    await userEvent.click(screen.getByRole("button", { name }));
    expect(onChange).toHaveBeenLastCalledWith({ ...OTHERS, procedure: ["Procedură simplificată", name] });
  });

  it("toggling the only procedure off leaves the field unset, not []", async () => {
    const onChange = setup({ ...OTHERS, procedure: ["Licitație deschisă"] });
    await userEvent.click(within(screen.getByRole("group", { name: "Procedure" })).getByRole("button", { name: "Licitație deschisă" }));
    const next = onChange.mock.lastCall![0] as RecordFilter;
    expect(next).toEqual(OTHERS);
    expect("procedure" in next).toBe(false);
  });

  it.each(RECORD_BADGES)("the %s badge chip adds that badge, and removes it when on", async (badge) => {
    const label = copy.badges.badges[badge].label;
    const onChange = setup({ ...OTHERS, badges: ["CRAWL_ONLY", "NO_VALUE"].filter((b) => b !== badge) as RecordFilter["badges"] });
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(onChange.mock.lastCall![0].badges).toContain(badge);
    onChange.mockClear();
  });

  it("toggling an active badge chip off removes only that badge", async () => {
    const onChange = setup({ badges: ["NO_VALUE", "SUSPECT_VALUE"] });
    await userEvent.click(within(screen.getByRole("group", { name: "Record badges" })).getByRole("button", { name: "No value" }));
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
    ["Up to 270,120 RON", () => without("valueBucket")],
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
