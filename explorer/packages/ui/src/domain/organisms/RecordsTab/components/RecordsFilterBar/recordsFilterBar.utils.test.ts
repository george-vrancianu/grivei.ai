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

describe("clearRecordFilters / hasRecordFilters", () => {
  it("clears every parameter the row shows and leaves the rest", () => {
    const filter: RecordFilter = { q: "x", channel: "CONTRACT", supplier: "1", cpv: "7", badges: ["NO_VALUE"], valueBucket: "UP_TO_10K", county: "RO-BV" };
    expect(clearRecordFilters(filter)).toEqual({ valueBucket: "UP_TO_10K", county: "RO-BV" });
  });
  it("sees nothing to clear in a filter with only other fields", () => {
    expect(hasRecordFilters({ county: "RO-BV", valueBucket: "UP_TO_10K" })).toBe(false);
    expect(hasRecordFilters({ badges: [] })).toBe(false);
    expect(hasRecordFilters({ cpv: "770" })).toBe(true);
  });
});
