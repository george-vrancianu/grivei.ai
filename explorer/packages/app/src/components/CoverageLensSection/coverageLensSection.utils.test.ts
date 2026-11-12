import { describe, expect, it } from "vitest";
import { coverageLensVariables } from "./coverageLensSection.utils.ts";

describe("coverageLensVariables", () => {
  it("is empty without a date chip, so the API answers for the whole harvest", () => {
    expect(coverageLensVariables({})).toEqual({});
  });
  it("sends only the bounds the date chip holds", () => {
    expect(coverageLensVariables({ from: "2023-01-01" })).toEqual({ window: { from: "2023-01-01" } });
    expect(coverageLensVariables({ to: "2023-12-31" })).toEqual({ window: { to: "2023-12-31" } });
    expect(coverageLensVariables({ from: "2023-01-01", to: "2023-12-31" })).toEqual({ window: { from: "2023-01-01", to: "2023-12-31" } });
  });
  it("ignores every other filter field", () => {
    expect(coverageLensVariables({ from: "2023-01-01", q: "comuna", county: "RO-BV" } as never)).toEqual({ window: { from: "2023-01-01" } });
  });
});
