import { describe, expect, it } from "vitest";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { createColorScale, featuresOf, NO_DATA_COLOR, projectFeatures } from "./baseMap.utils.ts";

describe("createColorScale", () => {
  it("gives grey to areas without a value, a colour that no value can take", () => {
    const scale = createColorScale("linear", [10, 20, 30]);
    const colours = [10, 15, 20, 30, 0, -5].map(scale.color);
    expect(scale.color(null)).toBe(NO_DATA_COLOR);
    expect(scale.color(undefined)).toBe(NO_DATA_COLOR);
    expect(scale.color(Number.NaN)).toBe(NO_DATA_COLOR);
    expect(colours).not.toContain(NO_DATA_COLOR);
    expect(scale.ramp(9)).not.toContain(NO_DATA_COLOR);
  });

  it("darkens from the lowest to the highest value", () => {
    const scale = createColorScale("linear", [0, 100]);
    expect(scale.domain).toEqual([0, 100]);
    expect(new Set([scale.color(0), scale.color(50), scale.color(100)]).size).toBe(3);
    expect(scale.color(0)).toBe(scale.ramp(2)[0]);
    expect(scale.color(100)).toBe(scale.ramp(2)[1]);
  });

  it("log: spans the smallest positive value to the largest and spaces by ratio", () => {
    const scale = createColorScale("log", [0, 1, 10, 100, null]);
    expect(scale.domain).toEqual([1, 100]);
    expect(scale.color(10)).toBe(createColorScale("linear", [0, 1]).color(0.5));
  });

  it("log: a zero is not log-scaled, it takes the lowest colour (never grey, never an error)", () => {
    const scale = createColorScale("log", [0, 5, 500]);
    expect(scale.color(0)).toBe(scale.color(5));
    expect(scale.color(0)).not.toBe(NO_DATA_COLOR);
    expect(scale.color(0)).not.toBe(scale.color(500));
  });

  it("copes with nothing to scale and with a single value", () => {
    const empty = createColorScale("log", [0, null, undefined]);
    expect(empty.domain).toBeNull();
    expect(empty.color(0)).not.toBe(NO_DATA_COLOR);
    expect(empty.color(null)).toBe(NO_DATA_COLOR);
    expect(createColorScale("linear", [7]).color(7)).not.toBe(NO_DATA_COLOR);
  });
});

describe("featuresOf and projectFeatures", () => {
  it("reads codes and names from the fixture outlines", () => {
    const features = featuresOf(countiesTopology);
    expect(features).toHaveLength(9);
    expect(features.map((f) => f.properties.code)).toContain("RO-BV");
    expect(features.find((f) => f.properties.code === "RO-BV")?.properties.name).toBe("Brașov");
    expect(featuresOf(uatsTopology)).toHaveLength(6);
  });

  it("throws on an unknown object", () => {
    expect(() => featuresOf(countiesTopology, { object: "nope" })).toThrow(/no object nope/);
  });

  it("fits every area inside the box, for both projections", () => {
    for (const projection of ["conic", "mercator"] as const) {
      const { paths, centroids } = projectFeatures(featuresOf(countiesTopology), 600, 400, { projection });
      expect(paths.size).toBe(9);
      for (const [x, y] of centroids.values()) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(600);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(400);
      }
      for (const d of paths.values()) expect(d).toMatch(/^M/);
    }
  });
});
