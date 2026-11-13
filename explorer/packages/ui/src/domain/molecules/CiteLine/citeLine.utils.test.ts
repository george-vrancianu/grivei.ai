import { describe, expect, it } from "vitest";
import { withoutScheme } from "./citeLine.utils.ts";

describe("withoutScheme", () => {
  it("drops https:// and http://, and nothing else", () => {
    expect(withoutScheme("https://grivei.ai/explore/record/CAN1145000")).toBe("grivei.ai/explore/record/CAN1145000");
    expect(withoutScheme("http://localhost:5173/explore/search?q=strazi&tab=records")).toBe("localhost:5173/explore/search?q=strazi&tab=records");
    expect(withoutScheme("grivei.ai/explore/")).toBe("grivei.ai/explore/");
  });
});
