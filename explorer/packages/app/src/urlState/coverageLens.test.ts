import { describe, expect, it } from "vitest";
import { decodeUrlState } from "./codec.ts";
import { coverageLensHref } from "./coverageLens.ts";

const decoded = (href: string) => decodeUrlState(href.split("?")[1] ?? "");

describe("the Coverage lens link", () => {
  it("keeps the county and the date chip and selects the lens, under the language's prefix", () => {
    const href = coverageLensHref("ro", { county: "RO-BV", from: "2023-01-01", to: "2023-12-31" });
    expect(href).toBe("/ro/explore/?from=2023-01-01&to=2023-12-31&county=RO-BV&lens=coverage");
    expect(decoded(href)).toEqual({ filter: { county: "RO-BV", from: "2023-01-01", to: "2023-12-31" }, lens: "coverage" });
  });

  it("keeps only the bounds the chip holds, and nothing when there is no county or chip", () => {
    expect(decoded(coverageLensHref("en", { from: "2022-01-01" }))).toEqual({ filter: { from: "2022-01-01" }, lens: "coverage" });
    expect(coverageLensHref("en", {})).toBe("/explore/?lens=coverage");
  });
});
