import { describe, expect, it } from "vitest";
import { counterpartyRole, countedRecords, shareOfTotal } from "./entityOverview.utils.ts";

describe("the Overview's utils", () => {
  it("largest Records lists only counted Records", () => {
    const rows = [
      { code: "DA1", counted: "100000" },
      { code: "CAN-suspect", counted: null },
      { code: "ceiling", counted: null },
      { code: "DA2", counted: "5000" },
    ];
    expect(countedRecords(rows).map((r) => r.code)).toEqual(["DA1", "DA2"]);
  });

  it("keeps the order the API ranked them in", () => {
    expect(countedRecords([{ counted: "1" }, { counted: "9" }]).map((r) => r.counted)).toEqual(["1", "9"]);
  });

  it("computes a share exactly on amounts too big for a Number", () => {
    expect(shareOfTotal("500000000000000000000", "1000000000000000000000")).toBe(0.5);
    expect(shareOfTotal("280000000", "340000000")).toBe(0.8235);
  });

  it("has no share when the whole is zero, and never leaves 0..1", () => {
    expect(shareOfTotal("0", "0")).toBeNull();
    expect(shareOfTotal("200", "100")).toBe(1);
  });

  it("puts a counterparty on the other side of the page's role", () => {
    expect(counterpartyRole("authority")).toBe("supplier");
    expect(counterpartyRole("supplier")).toBe("authority");
  });
});
