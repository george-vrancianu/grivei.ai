import { describe, expect, it } from "vitest";
import { countyAfterClick, countyAfterSideChange } from "./moneyLensSection.utils.ts";

describe("countyAfterClick", () => {
  it("chooses the clicked area", () => {
    expect(countyAfterClick(undefined, "RO-BV")).toBe("RO-BV");
    expect(countyAfterClick("RO-BV", "RO-CJ")).toBe("RO-CJ");
    expect(countyAfterClick("RO-BV", "NATIONAL")).toBe("NATIONAL");
  });
  it("takes the choice back when the chosen area is clicked again", () => {
    expect(countyAfterClick("RO-BV", "RO-BV")).toBeUndefined();
    expect(countyAfterClick("UNPLACED", "UNPLACED")).toBeUndefined();
  });
});

describe("countyAfterSideChange", () => {
  it("keeps a county on either side", () => {
    expect(countyAfterSideChange("RO-BV", "SUPPLIER")).toBe("RO-BV");
    expect(countyAfterSideChange("RO-BV", "AUTHORITY")).toBe("RO-BV");
    expect(countyAfterSideChange(undefined, "SUPPLIER")).toBeUndefined();
  });
  it("drops an off-map area the other side does not have (it would match nothing)", () => {
    expect(countyAfterSideChange("NATIONAL", "SUPPLIER")).toBeUndefined();
    expect(countyAfterSideChange("UNPLACED", "SUPPLIER")).toBeUndefined();
    expect(countyAfterSideChange("UNKNOWN_SUPPLIER_COUNTY", "AUTHORITY")).toBeUndefined();
    expect(countyAfterSideChange("UNPLACED", "AUTHORITY")).toBe("UNPLACED");
    expect(countyAfterSideChange("UNKNOWN_SUPPLIER_COUNTY", "SUPPLIER")).toBe("UNKNOWN_SUPPLIER_COUNTY");
  });
});
