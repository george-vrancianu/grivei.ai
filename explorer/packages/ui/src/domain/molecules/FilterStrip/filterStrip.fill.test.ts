import { describe, expect, it } from "vitest";
import { STRIP_FILL, STRIP_FILL_CLEAR, STRIP_FILL_SOLID } from "./filterStrip.fill.ts";

describe("the strip fill", () => {
  it("is the ground colour at 35%, and as one solid colour over the panel", () => {
    expect(STRIP_FILL).toBe("rgba(13, 16, 20, 0.35)");
    expect(STRIP_FILL_SOLID).toBe("rgb(18, 22, 28)");
    expect(STRIP_FILL_CLEAR).toBe("rgba(18, 22, 28, 0)");
  });
});
