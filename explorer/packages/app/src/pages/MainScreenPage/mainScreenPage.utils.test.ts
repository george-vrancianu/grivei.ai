import { describe, expect, it } from "vitest";
import { catalogue } from "../../copy/index.ts";
import { testCountyTopology } from "../../testing/countyTopology.ts";
import { anyInFlight, busyPanels, countyChipName } from "./mainScreenPage.utils.ts";

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

describe("the held-query derivations", () => {
  const loading = { status: "loading" } as const;
  const fresh = { status: "ready", data: 1, stale: false } as const;
  const held = { status: "ready", data: 1, stale: true } as const;
  const failed = { status: "error", retry: () => {} } as const;

  it("counts a loading or held query as in flight, but only for the zoom and coverage queries that are asked", () => {
    expect(anyInFlight(fresh, { asked: false, state: loading }, { asked: false, state: held })).toBe(false);
    expect(anyInFlight(fresh, { asked: true, state: held }, { asked: false, state: fresh })).toBe(true);
    expect(anyInFlight(fresh, { asked: false, state: fresh }, { asked: true, state: loading })).toBe(true);
    expect(anyInFlight(held, { asked: false, state: fresh }, { asked: false, state: fresh })).toBe(true);
    expect(anyInFlight(failed, { asked: false, state: fresh }, { asked: false, state: fresh })).toBe(false);
  });

  it("dims the summary with the main query and the map with the query behind the lens on show", () => {
    expect(busyPanels(held, { coverage: false, zoomed: false }, fresh, fresh)).toEqual({ summary: true, map: true });
    expect(busyPanels(held, { coverage: false, zoomed: true }, fresh, fresh)).toEqual({ summary: true, map: false });
    expect(busyPanels(fresh, { coverage: true, zoomed: true }, fresh, held)).toEqual({ summary: false, map: true });
    expect(busyPanels(fresh, { coverage: false, zoomed: true }, held, fresh)).toEqual({ summary: false, map: true });
  });
});
