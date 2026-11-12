import { describe, expect, it } from "vitest";
import { moneyMapValues, moneyValueFormatter, totalsByCounty } from "./moneyLensMap.utils.ts";

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

describe("moneyValueFormatter", () => {
  const format = moneyValueFormatter(totalsByCounty({ counties }), "en");
  it("shows the exact Bani string of the area's Total, ignoring the colour value", () => {
    expect(format(1, "RO-BV")).toBe("RON\u00a01,020,000");
  });
  it("falls back to the rounded value for a legend end with no area", () => {
    expect(format(250_000.4)).toBe("RON\u00a02,500");
  });
  it("falls back to the value for an unknown code", () => {
    expect(format(100, "RO-XX")).toBe("RON\u00a01");
  });
});
