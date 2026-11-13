import { describe, expect, it } from "vitest";
import { VALUE_BUCKETS } from "@grivei/contract";
import { sampleCopy } from "./copy.ts";

/** The RON edge as the copy writes it: grouped digits, or "1 bn"/"1 mld." for a billion. */
const ron = (bani: string, locale: "en" | "ro"): string => {
  const n = BigInt(bani) / 100n;
  if (n === 1_000_000_000n) return locale === "en" ? "1 bn" : "1 mld.";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, locale === "en" ? "," : ".");
};

describe("Romanian consortium size (samples)", () => {
  const of = (n: number) => sampleCopy.recordDetail("ro").parties.consortiumOf(n, String(n));
  it("takes 'de' before the plural from 20 up", () => {
    expect(of(6)).toBe("consorțiu de 6 membri");
    expect(of(20)).toBe("consorțiu de 20 de membri");
  });
});

describe.each(["en", "ro"] as const)("value bucket labels (%s)", (locale) => {
  it("name the band's edges from VALUE_BUCKETS: lower edge (the previous bucket's) and inclusive upper edge", () => {
    const options = sampleCopy.filterChips(locale).valueBucket.options;
    VALUE_BUCKETS.forEach((edge, i) => {
      const label = options[edge.bucket];
      const lower = i === 0 ? null : (VALUE_BUCKETS[i - 1]?.upToBani ?? null);
      if (lower !== null) expect(label, `${edge.bucket} lower`).toContain(ron(lower, locale));
      if (edge.upToBani !== null) expect(label, `${edge.bucket} upper`).toContain(ron(edge.upToBani, locale));
    });
  });
});
