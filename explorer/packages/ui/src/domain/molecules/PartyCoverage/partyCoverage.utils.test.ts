import { describe, expect, it } from "vitest";
import type { PartyCoverageData } from "../../types.ts";
import { unattributedShare } from "./partyCoverage.utils.ts";

const slice = (awarded: string) => ({ records: 1, awarded });
const coverage = (o: Partial<PartyCoverageData> = {}): PartyCoverageData => ({
  party: "PARTIDUL SOCIAL DEMOCRAT", direct: slice("0"), subordinate: slice("0"), otherParties: slice("0"), independent: slice("0"), unattributed: slice("0"), ...o,
});

describe("unattributedShare", () => {
  it("is the unattributed part of the whole set, to a tenth of a percent", () => {
    expect(unattributedShare(coverage({ direct: slice("1000"), unattributed: slice("1000") }), "en")).toBe("50%");
    expect(unattributedShare(coverage({ direct: slice("22"), subordinate: slice("8"), otherParties: slice("14"), independent: slice("1"), unattributed: slice("15") }), "en")).toBe("25%");
    expect(unattributedShare(coverage({ direct: slice("2"), unattributed: slice("1") }), "en")).toBe("33.3%");
  });

  it("formats the number in the reader's language", () => {
    expect(unattributedShare(coverage({ direct: slice("2"), unattributed: slice("1") }), "ro")).toMatch(/^33,3\s?%$/);
  });

  it("is exact for sums beyond 2^53 bani", () => {
    const big = "9007199254740993000";
    expect(unattributedShare(coverage({ direct: slice(big), unattributed: slice(big) }), "en")).toBe("50%");
  });

  it("says nothing for a set with no value, and 0% when everything is attributed", () => {
    expect(unattributedShare(coverage(), "en")).toBeNull();
    expect(unattributedShare(coverage({ direct: slice("5") }), "en")).toBe("0%");
  });

  it("never rounds the unattributed share up", () => {
    expect(unattributedShare(coverage({ direct: slice("1"), unattributed: slice("1999") }), "en")).toBe("99.9%");
  });
});
