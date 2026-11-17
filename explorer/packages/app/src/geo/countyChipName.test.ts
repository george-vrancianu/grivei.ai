import { describe, expect, it } from "vitest";
import { catalogue } from "../copy/index.ts";
import { testCountyTopology } from "../testing/countyTopology.ts";
import { countyChipName } from "./countyChipName.ts";

const ready = { status: "ready", topology: testCountyTopology } as const;

describe.each(["en", "ro"] as const)("the county chip's name (%s)", (locale) => {
  const tiles = catalogue[locale].moneyLensMap.tiles;

  it("is the topology's name for a county", () => {
    expect(countyChipName("RO-BV", ready, tiles)).toBe("Brașov");
  });

  it("falls back to the code while the outlines load, fail, or do not know the county", () => {
    expect(countyChipName("RO-BV", { status: "loading" }, tiles)).toBe("RO-BV");
    expect(countyChipName("RO-BV", { status: "error" }, tiles)).toBe("RO-BV");
    expect(countyChipName("RO-XX", ready, tiles)).toBe("RO-XX");
  });

  it("is the tile's label for an off-map area, never the raw code, with or without outlines", () => {
    for (const topology of [ready, { status: "loading" } as const]) {
      expect(countyChipName("UNPLACED", topology, tiles)).toBe(tiles.unplaced);
      expect(countyChipName("NATIONAL", topology, tiles)).toBe(tiles.national);
      expect(countyChipName("UNKNOWN_SUPPLIER_COUNTY", topology, tiles)).toBe(tiles.unknownSupplierCounty);
    }
  });
});
