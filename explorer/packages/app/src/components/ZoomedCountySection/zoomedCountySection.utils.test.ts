import { describe, expect, it } from "vitest";
import { uatAfterClick, zoomedCountyOf, zoomVariables } from "./zoomedCountySection.utils.ts";

describe("zoomedCountyOf", () => {
  it("zooms into an ISO county on the authority side (the default)", () => {
    expect(zoomedCountyOf({ county: "RO-BV" })).toBe("RO-BV");
    expect(zoomedCountyOf({ county: "RO-B", countySide: "AUTHORITY" })).toBe("RO-B");
  });
  it("does not zoom without a county, on an off-map area, or on the supplier side", () => {
    expect(zoomedCountyOf({})).toBeNull();
    for (const county of ["NATIONAL", "UNPLACED", "UNKNOWN_SUPPLIER_COUNTY"] as const) expect(zoomedCountyOf({ county })).toBeNull();
    expect(zoomedCountyOf({ county: "RO-BV", countySide: "SUPPLIER" })).toBeNull();
  });
});

describe("zoomVariables", () => {
  it("keeps the filter and the county but not the UAT", () => {
    expect(zoomVariables({ q: "comuna", county: "RO-BV", uat: "880010", channel: "DIRECT_PURCHASE" }, "RO-BV")).toEqual({
      filter: { q: "comuna", county: "RO-BV", channel: "DIRECT_PURCHASE" },
      county: "RO-BV",
    });
  });
});

describe("uatAfterClick", () => {
  it("chooses a UAT, and takes the choice back on a second click", () => {
    expect(uatAfterClick(undefined, "880010")).toBe("880010");
    expect(uatAfterClick("880001", "880010")).toBe("880010");
    expect(uatAfterClick("880010", "880010")).toBeUndefined();
  });
});
