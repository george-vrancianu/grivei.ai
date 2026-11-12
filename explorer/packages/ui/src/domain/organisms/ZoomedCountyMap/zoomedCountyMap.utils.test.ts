import { describe, expect, it } from "vitest";
import { typicalCounty } from "../../samples/uatMaps.ts";
import { authoritiesByUat, circleRadius } from "./zoomedCountyMap.utils.ts";

describe("zoomedCountyMap utils", () => {
  it("reads the number of authorities by SIRUTA", () => {
    const authorities = authoritiesByUat(typicalCounty);
    expect(authorities.get("990206")).toBe(74);
    expect(authorities.has("990202")).toBe(false);
  });

  it("sizes circles by area: the largest gets the maximum, a single authority still gets a dot, none gets nothing", () => {
    expect(circleRadius(74, 74)).toBe(16);
    expect(circleRadius(1, 74)).toBe(3);
    expect(circleRadius(19, 76)).toBeCloseTo(8);
    expect(circleRadius(0, 74)).toBe(0);
  });
});
