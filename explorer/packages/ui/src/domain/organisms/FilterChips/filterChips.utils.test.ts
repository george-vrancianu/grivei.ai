import type { RecordFilter } from "@grivei/contract";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import {
  activeChips, chipFieldsOf, clearChips, procedureChoices, setFromYear, setToYear, toggleBadge, toggleChannel, toggleHasSignals, toggleItem,
  toggleProcedure, toggleValueBucket, withFields, yearOf, yearOptions,
  type ActiveChipText,
} from "./filterChips.utils.ts";

const copy = sampleCopy.filterChips("en");
const text: ActiveChipText = {
  from: copy.active.from,
  to: copy.active.to,
  channel: copy.channel.options,
  valueBucket: copy.valueBucket.options,
  hasSignals: copy.signals.has,
  withoutSignals: copy.signals.without,
  badges: Object.fromEntries(Object.entries(copy.badges.badges).map(([b, t]) => [b, t.label])) as ActiveChipText["badges"],
};

describe("filter helpers", () => {
  it("withFields drops unset values and empty lists, never leaving []", () => {
    expect(withFields({ q: "a", procedure: ["x"] }, { procedure: [], channel: undefined, hasSignals: null })).toEqual({ q: "a" });
    expect("procedure" in withFields({ procedure: ["x"] }, { procedure: [] })).toBe(false);
  });

  it("sets years as Jan 1 and Dec 31 and unsets an end", () => {
    expect(setFromYear({}, 2023)).toEqual({ from: "2023-01-01" });
    expect(setToYear({ from: "2023-01-01" }, 2024)).toEqual({ from: "2023-01-01", to: "2024-12-31" });
    expect(setFromYear({ from: "2023-01-01", to: "2024-12-31" }, undefined)).toEqual({ to: "2024-12-31" });
  });

  it("reads the year of a date, and nothing from other text", () => {
    expect(yearOf("2024-03-15")).toBe(2024);
    expect(yearOf("soon")).toBeUndefined();
    expect(yearOf(null)).toBeUndefined();
  });

  it("offers firstYear..lastYear plus any year the filter holds outside it", () => {
    expect(yearOptions(2021, 2023, {})).toEqual([2021, 2022, 2023]);
    expect(yearOptions(2021, 2022, { from: "2019-01-01", to: "2030-12-31" })).toEqual([2019, 2021, 2022, 2030]);
  });

  it("toggles list items, keeping order", () => {
    expect(toggleItem(undefined, "a")).toEqual(["a"]);
    expect(toggleItem(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(toggleItem(["a", "b"], "a")).toEqual(["b"]);
  });

  it("toggles single choices off by choosing them again", () => {
    expect(toggleChannel({}, "CONTRACT")).toEqual({ channel: "CONTRACT" });
    expect(toggleChannel({ channel: "CONTRACT" }, "CONTRACT")).toEqual({});
    expect(toggleChannel({ channel: "CONTRACT" }, "DIRECT_PURCHASE")).toEqual({ channel: "DIRECT_PURCHASE" });
    expect(toggleValueBucket({ valueBucket: "UP_TO_9M" }, "UP_TO_9M")).toEqual({});
  });

  it("has Signals is true or unset; a given false becomes true", () => {
    expect(toggleHasSignals({})).toEqual({ hasSignals: true });
    expect(toggleHasSignals({ hasSignals: true })).toEqual({});
    expect(toggleHasSignals({ hasSignals: false })).toEqual({ hasSignals: true });
  });

  it("empties lists to unset", () => {
    expect(toggleBadge({ badges: ["NO_VALUE"] }, "NO_VALUE")).toEqual({});
    expect(toggleProcedure({ procedure: ["x"] }, "x")).toEqual({});
  });

  it("clears only the chip-owned fields", () => {
    const filter = { q: "a", county: "RO-BV", uat: "1", authority: "k", supplier: "s", cpv: "301", signal: "SPLITTING", countySide: "SUPPLIER", channel: "CONTRACT", from: "2024-01-01", badges: ["NO_VALUE"] } as const;
    expect(clearChips({ ...filter, badges: ["NO_VALUE"] })).toEqual({ q: "a", county: "RO-BV", uat: "1", authority: "k", supplier: "s", cpv: "301", signal: "SPLITTING", countySide: "SUPPLIER" });
  });

  it("chipFieldsOf names every chip field, absent ones undefined", () => {
    const patch = chipFieldsOf({ channel: "CONTRACT" });
    expect(Object.keys(patch).sort()).toEqual(["badges", "channel", "from", "hasSignals", "procedure", "to", "valueBucket"]);
    expect(patch.from).toBeUndefined();
    expect(patch.channel).toBe("CONTRACT");
  });

  it("adds procedures the filter holds to those offered", () => {
    expect(procedureChoices(["a", "b"], { procedure: ["b", "z"] })).toEqual(["a", "b", "z"]);
  });
});

describe("activeChips", () => {
  it("is empty for a filter without chip fields", () => {
    expect(activeChips({ q: "x", county: "RO-BV" }, text, "en")).toEqual([]);
  });

  it("labels years for year edges and exact dates otherwise", () => {
    const labels = (f: RecordFilter) => activeChips(f, text, "en").map((chip) => chip.label);
    expect(labels({ from: "2023-01-01", to: "2024-12-31" })).toEqual(["From 2023", "Until 2024"]);
    expect(labels({ from: "2024-03-15" })[0]).toBe("From 15 Mar 2024");
    expect(labels({ from: "garbage" })).toEqual(["From garbage"]);
  });

  it("lists every kind in a stable order and each removes only itself", () => {
    const filter: RecordFilter = {
      to: "2024-12-31", channel: "CONTRACT", valueBucket: "UP_TO_270K", hasSignals: false, procedure: ["Licitație deschisă", "Achiziție directă"], badges: ["NO_VALUE", "SUSPECT_VALUE"], q: "a",
    };
    const chips = activeChips(filter, text, "en");
    expect(chips.map((chip) => chip.label)).toEqual([
      "Until 2024", "Contract", "Up to 270,120 RON", "Without Signals", "Licitație deschisă", "Achiziție directă", "No value", "Suspect value",
    ]);
    const base: RecordFilter = { ...filter };
    expect(chips[3]!.remove(base)).not.toHaveProperty("hasSignals");
    expect(chips[4]!.remove(base).procedure).toEqual(["Achiziție directă"]);
    expect(chips[6]!.remove(base).badges).toEqual(["SUSPECT_VALUE"]);
    expect(chips[6]!.remove({ ...base, badges: ["NO_VALUE"] })).not.toHaveProperty("badges");
  });
});
