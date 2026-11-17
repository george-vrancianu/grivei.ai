import { describe, expect, it } from "vitest";
import { testUatTopologies } from "../testing/uatTopology.ts";
import { uatChipName } from "./uatChipName.ts";

const ready = { status: "ready", topology: testUatTopologies["RO-BV"]! } as const;

describe("the UAT chip's name", () => {
  it("is the outlines' name for the SIRUTA", () => {
    expect(uatChipName("880010", ready)).toBe("Sânpetru");
  });
  it("is a sector's name for Bucharest", () => {
    expect(uatChipName("179169", { status: "ready", topology: testUatTopologies["RO-B"]! })).toBe("Sector 3");
  });
  it("is unknown while the outlines load or fail, or for a code they do not hold", () => {
    expect(uatChipName("880010", { status: "loading" })).toBeUndefined();
    expect(uatChipName("880010", { status: "error" })).toBeUndefined();
    expect(uatChipName("1", ready)).toBeUndefined();
  });
});
