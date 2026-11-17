import type { RecordFilter } from "@grivei/contract";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords } from "../../../../samples/fixtureData.ts";
import { clearRecordFilters, hasRecordFilters, recordChips } from "./recordsFilterBar.utils.ts";

const copy = sampleCopy.recordsFacets("en");
const chips = (filter: RecordFilter) => recordChips(filter, "authority", authorityRecords.facets, copy, "en");

describe("recordChips", () => {
  it("shows one chip per parameter a Signal's reproducing filter sets, each removing only its own", () => {
    const filter: RecordFilter = { signal: "NO_PUBLICATION", supplier: "2000007", from: "2024-03-01", to: "2024-05-31", cpv: "45210000", q: "x" };
    const made = chips(filter);
    expect(made.map((chip) => chip.label)).toEqual(["Signal: No publication", "ALFA DEMO SRL", "1 Mar 2024 – 31 May 2024", "CPV: 45210000", "only Records matching “x”"]);
    expect(made[0]!.remove(filter)).toEqual({ supplier: "2000007", from: "2024-03-01", to: "2024-05-31", cpv: "45210000", q: "x" });
    expect(made[2]!.remove(filter)).toEqual({ signal: "NO_PUBLICATION", supplier: "2000007", cpv: "45210000", q: "x" });
    expect(made[3]!.remove(filter)).toEqual({ signal: "NO_PUBLICATION", supplier: "2000007", from: "2024-03-01", to: "2024-05-31", q: "x" });
  });
  it("names a whole calendar year as the year and an unlisted counterparty by its key", () => {
    expect(chips({ from: "2023-01-01", to: "2023-12-31", supplier: "999" }).map((chip) => chip.label)).toEqual(["Counterparty 999", "2023"]);
  });
});

describe("recordChips, the carried main-screen parameters", () => {
  const filter: RecordFilter = { valueBucket: "UP_TO_10K", hasSignals: false, party: "USR", county: "RO-BV", uat: "1", countySide: "SUPPLIER", q: "x" };
  it("shows a chip each, ahead of the search text", () => {
    expect(chips(filter).map((chip) => chip.label)).toEqual(["Up to 10,000 RON", "Without Signals", "Party: USR", "County: RO-BV", "only Records matching “x”"]);
  });
  it("each removes only its own parameter; the county takes its UAT and side with it", () => {
    const made = chips(filter);
    expect(made[0]!.remove(filter)).not.toHaveProperty("valueBucket");
    expect(made[1]!.remove(filter)).toEqual({ ...filter, hasSignals: undefined });
    expect(made[2]!.remove(filter)).toEqual({ ...filter, party: undefined });
    expect(made[3]!.remove(filter)).toEqual({ valueBucket: "UP_TO_10K", hasSignals: false, party: "USR", q: "x" });
  });
});

describe("clearRecordFilters / hasRecordFilters", () => {
  it("clears every parameter the row shows and leaves the rest", () => {
    const filter: RecordFilter = { q: "x", channel: "CONTRACT", supplier: "1", cpv: "7", badges: ["NO_VALUE"], valueBucket: "UP_TO_10K", county: "RO-BV" };
    expect(clearRecordFilters(filter)).toEqual({});
  });
  it("clears the carried main-screen parameters too, the county with its UAT and side", () => {
    expect(clearRecordFilters({ hasSignals: false, valueBucket: "UP_TO_10K", party: "X", county: "RO-BV", uat: "1", countySide: "SUPPLIER", q: "x" })).toEqual({});
  });
  it("sees nothing to clear in a filter with only other fields", () => {
    expect(hasRecordFilters({ countySide: "SUPPLIER" })).toBe(false);
    expect(hasRecordFilters({ hasSignals: false })).toBe(true);
    expect(hasRecordFilters({ county: "RO-BV" })).toBe(true);
    expect(hasRecordFilters({ badges: [] })).toBe(false);
    expect(hasRecordFilters({ cpv: "770" })).toBe(true);
  });
});
