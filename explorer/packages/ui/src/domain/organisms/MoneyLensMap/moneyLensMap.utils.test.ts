import { describe, expect, it } from "vitest";
import { moneyMapValues, totalsByCounty } from "./moneyLensMap.utils.ts";

const total = (awarded: string, records: number) => ({ awarded, records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });
const counties = [
  { area: "RO-BV", name: "Brașov", entities: 3, total: total("102000000", 6) },
  { area: "RO-CJ", name: "Cluj", entities: 1, total: total("0", 0) },
];

describe("moneyMapValues", () => {
  it("maps each county to its awarded bani, zero included", () => {
    expect(moneyMapValues({ counties })).toEqual({ "RO-BV": 102_000_000, "RO-CJ": 0 });
  });
  it("leaves out counties the map does not list", () => {
    expect(moneyMapValues({ counties: [] })).toEqual({});
  });
});

describe("totalsByCounty", () => {
  it("keeps the exact Bani string", () => {
    expect(totalsByCounty({ counties }).get("RO-BV")?.awarded).toBe("102000000");
  });
});
