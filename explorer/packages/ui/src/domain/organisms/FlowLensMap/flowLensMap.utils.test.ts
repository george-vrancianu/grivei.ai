import { describe, expect, it } from "vitest";
import { authorityNationwideFlow, supplierNationwideFlow } from "../../samples/flowMaps.ts";
import {
  MAX_ARC_WIDTH, MAX_BUBBLE_RADIUS, MIN_ARC_WIDTH, MIN_BUBBLE_RADIUS, arcShape, arcWidth, bubbleRadius, flowMarks, flowRows, flowSide, isEmptyFlow, maxAwarded, ratio,
} from "./flowLensMap.utils.ts";

const centroids = new Map<string, readonly [number, number]>([
  ["HOME", [100, 100]],
  ["A", [300, 100]],
  ["B", [100, 300]],
  ["C", [300, 300]],
]);
const row = (code: string, awarded: string) => ({ code, name: code, awarded, records: 1, estimated: false });

describe("bubbleRadius", () => {
  it("is zero at zero money and the maximum at the largest county", () => {
    expect(bubbleRadius("0", "1000")).toBe(0);
    expect(bubbleRadius("1000", "1000")).toBe(MAX_BUBBLE_RADIUS);
  });

  it("makes the area proportional to the money: a quarter of the money has half the radius", () => {
    expect(bubbleRadius("250000", "1000000") / bubbleRadius("1000000", "1000000")).toBeCloseTo(0.5, 5);
    expect(bubbleRadius("90000", "1000000") / bubbleRadius("360000", "1000000")).toBeCloseTo(0.5, 5);
  });

  it("keeps a county with a sliver of money visible", () => {
    expect(bubbleRadius("1", "100000000000")).toBe(MIN_BUBBLE_RADIUS);
  });

  it("reads exact Bani beyond Number's safe range", () => {
    expect(ratio("9007199254740993", "9007199254740993")).toBe(1);
    expect(ratio("4503599627370497", "9007199254740994")).toBeCloseTo(0.5, 6);
  });
});

describe("arcWidth", () => {
  it("is linear in the money, zero at zero, and the maximum at the largest", () => {
    expect(arcWidth("0", "100")).toBe(0);
    expect(arcWidth("100", "100")).toBe(MAX_ARC_WIDTH);
    expect(arcWidth("50", "100")).toBe(MAX_ARC_WIDTH / 2);
    expect(arcWidth("25", "100")).toBe(MAX_ARC_WIDTH / 4);
  });

  it("never draws a thinner arc than the minimum when there is money", () => {
    expect(arcWidth("1", "1000000")).toBe(MIN_ARC_WIDTH);
  });
});

describe("flowRows and maxAwarded", () => {
  it("keeps the counties with money, with their exact Bani, in order", () => {
    expect(flowRows(supplierNationwideFlow).map((r) => [r.code, r.awarded])).toEqual([
      ["RO-BV", "280000000"], ["RO-IS", "70000000"], ["RO-SV", "17500000"], ["RO-CJ", "120000000"],
    ]);
    expect(maxAwarded(flowRows(supplierNationwideFlow))).toBe("280000000");
    expect(maxAwarded([])).toBe("0");
  });
});

describe("flowMarks", () => {
  const rows = [row("HOME", "400"), row("A", "1600"), row("B", "400"), row("C", "100")];

  it("draws a bubble per county, sqrt by money, on the centroid", () => {
    const { bubbles } = flowMarks(rows, centroids, "HOME", "supplier");
    expect(bubbles.map((b) => b.code)).toEqual(["HOME", "A", "B", "C"]);
    expect(bubbles.map((b) => b.r)).toEqual([15, 30, 15, 7.5]);
    expect(bubbles[1]).toMatchObject({ x: 300, y: 100 });
  });

  it("draws one arc per county but the home county, wide by money", () => {
    const { arcs } = flowMarks(rows, centroids, "HOME", "supplier");
    expect(arcs.map((a) => a.code)).toEqual(["A", "B", "C"]);
    expect(arcs.map((a) => a.width)).toEqual([MAX_ARC_WIDTH, 3, MIN_ARC_WIDTH]);
  });

  it("points into the home county for a supplier and out of it for an authority", () => {
    expect(flowMarks(rows, centroids, "HOME", "supplier").arcs.map((a) => [a.from, a.to])).toEqual([["A", "HOME"], ["B", "HOME"], ["C", "HOME"]]);
    expect(flowMarks(rows, centroids, "HOME", "authority").arcs.map((a) => [a.from, a.to])).toEqual([["HOME", "A"], ["HOME", "B"], ["HOME", "C"]]);
  });

  it("draws no arc without a home county, or when the home county has no outline", () => {
    expect(flowMarks(rows, centroids, null, "supplier").arcs).toEqual([]);
    expect(flowMarks(rows, centroids, "NOWHERE", "supplier").arcs).toEqual([]);
    expect(flowMarks(rows, centroids, null, "supplier").bubbles).toHaveLength(4);
  });

  it("draws no arc when everything is in the home county", () => {
    const local = flowMarks([row("HOME", "400")], centroids, "HOME", "authority");
    expect(local.bubbles).toHaveLength(1);
    expect(local.arcs).toEqual([]);
  });

  it("skips counties the outlines do not have", () => {
    expect(flowMarks([...rows, row("GONE", "5")], centroids, "HOME", "supplier").bubbles.map((b) => b.code)).not.toContain("GONE");
  });
});

describe("arcShape", () => {
  it("ends the curve before the receiving bubble and puts the arrowhead tip on its edge", () => {
    const shape = arcShape([0, 0], [100, 0], 5, 10, 2)!;
    expect(shape.d.startsWith("M")).toBe(true);
    const tip = shape.head.split(" ")[0]!.split(",").map(Number);
    expect(Math.hypot(tip[0]! - 100, tip[1]!)).toBeCloseTo(10, 0);
  });

  it("returns null for coinciding centres", () => {
    expect(arcShape([1, 1], [1, 1], 1, 1, 1)).toBeNull();
  });
});

describe("flowSide and isEmptyFlow", () => {
  it("draws a supplier's flow on the authority side and an authority's on the supplier side", () => {
    expect(flowSide("supplier")).toBe("AUTHORITY");
    expect(flowSide("authority")).toBe("SUPPLIER");
  });

  it("is empty only when no county and no tile holds anything", () => {
    expect(isEmptyFlow(authorityNationwideFlow)).toBe(false);
    const zero = { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false };
    expect(isEmptyFlow({ counties: [], national: zero, unplaced: null, unknownSupplierCounty: null })).toBe(true);
    expect(isEmptyFlow({ counties: [], national: zero, unplaced: null, unknownSupplierCounty: { ...zero, awarded: "5", records: 1 } })).toBe(false);
  });
});
