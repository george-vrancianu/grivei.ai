import { describe, expect, it } from "vitest";
import { otherSide, scopeFilter, shareOf, withCounterparty } from "./role.ts";

describe("shareOf", () => {
  it("is the part over the whole, 0 when nothing was awarded", () => {
    expect(shareOf("50", "200")).toBe(0.25);
    expect(shareOf("0", "0")).toBe(0);
    expect(shareOf("5", "0")).toBe(0);
    expect(shareOf("200", "200")).toBe(1);
  });
  it("keeps exactness on sums beyond what a double holds", () => {
    expect(shareOf("9007199254740993", "9007199254740993")).toBe(1); // 2^53 + 1
    expect(shareOf("4503599627370497", "9007199254740994")).toBeCloseTo(0.5, 12);
  });
});

describe("scoping a filter to an entity role", () => {
  it("pins the entity on its own side and keeps the rest", () => {
    expect(scopeFilter("AUTHORITY", "1000017", { channel: "CONTRACT", supplier: "2000007" })).toEqual({ channel: "CONTRACT", supplier: "2000007", authority: "1000017" });
    expect(scopeFilter("SUPPLIER", "2000007", { from: "2023-01-01", authority: "1000017" })).toEqual({ from: "2023-01-01", authority: "1000017", supplier: "2000007" });
    expect(scopeFilter("SUPPLIER", "2000007", null)).toEqual({ supplier: "2000007" });
  });
  it("overrides another entity of the same side (the page's entity wins)", () => {
    expect(scopeFilter("AUTHORITY", "1000017", { authority: "1000009" }).authority).toBe("1000017");
  });
  it("picks a counterparty on the other side", () => {
    expect(withCounterparty("AUTHORITY", "2000015", { authority: "1000017" })).toEqual({ authority: "1000017", supplier: "2000015" });
    expect(withCounterparty("SUPPLIER", "1000009", { supplier: "2000007" })).toEqual({ supplier: "2000007", authority: "1000009" });
  });
  it("the counterparties of an authority are suppliers and the other way round", () => {
    expect(otherSide("AUTHORITY")).toBe("SUPPLIER");
    expect(otherSide("SUPPLIER")).toBe("AUTHORITY");
  });
});
