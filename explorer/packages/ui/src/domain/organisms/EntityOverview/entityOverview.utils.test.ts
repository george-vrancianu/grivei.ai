import { describe, expect, it } from "vitest";
import { counterpartyRole, countedRecords, shareBarPercent, shareOfTotal, SIGNALS_ANCHOR } from "./entityOverview.utils.ts";

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

describe("the concentration bars", () => {
  it("fill by the share of the total, as a percentage", () => {
    expect(shareBarPercent(0.188)).toBeCloseTo(18.8);
    expect(shareBarPercent(1)).toBe(100);
    expect(shareBarPercent(0)).toBe(0);
  });

  it("are empty when there is no share to tell, and never leave 0..100", () => {
    expect(shareBarPercent(null)).toBe(0);
    expect(shareBarPercent(Number.NaN)).toBe(0);
    expect(shareBarPercent(1.4)).toBe(100);
    expect(shareBarPercent(-0.2)).toBe(0);
  });

  it("are the share of the total, not scaled up to the largest row", () => {
    // 1,080 M of 9,000 M is 12%: a bar a little over a tenth full, not a full one
    expect(shareBarPercent(shareOfTotal("108000000000", "900000000000"))).toBe(12);
  });
});

describe("the Signals anchor", () => {
  it("is one fixed id, the same in both languages", () => {
    expect(SIGNALS_ANCHOR).toBe("signals");
  });
});
