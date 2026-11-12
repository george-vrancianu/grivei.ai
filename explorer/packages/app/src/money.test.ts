import { describe, expect, it } from "vitest";
import { formatBani } from "./money.ts";

describe("formatBani", () => {
  it.each([
    ["0", "RON 0.00", "0,00 RON"],
    ["5", "RON 0.05", "0,05 RON"],
    ["120050", "RON 1,200.50", "1.200,50 RON"],
    ["8600000000000000", "RON 86,000,000,000,000.00", "86.000.000.000.000,00 RON"], // beyond what a float keeps exact
    ["9007199254740993", "RON 90,071,992,547,409.93", "90.071.992.547.409,93 RON"],
  ])("%s bani", (bani, en, ro) => {
    expect(formatBani(bani, "en").replace(/\s/g, " ")).toBe(en);
    expect(formatBani(bani, "ro").replace(/\s/g, " ")).toBe(ro);
  });
});
