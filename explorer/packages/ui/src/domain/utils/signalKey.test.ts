import { describe, expect, it } from "vitest";
import { signalKeys } from "./signalKey.ts";

const base = { rule: "FRAMEWORK_OVERRUN", date: "2024-03-12", reproduce: { authority: "1", from: null, to: null }, recordCount: 3 };

describe("signalKeys", () => {
  it("gives distinct Signals distinct keys", () => {
    const keys = signalKeys([base, { ...base, date: "2024-04-01" }, { ...base, reproduce: { authority: "2", from: null, to: null } }]);
    expect(new Set(keys).size).toBe(3);
  });

  it("keeps two Signals with the same rule, date and filter apart", () => {
    const keys = signalKeys([base, { ...base }]);
    expect(new Set(keys).size).toBe(2);
  });
});
