import { describe, expect, it } from "vitest";
import { SEAP_NAMES_SHOWN, seapNamesSummary } from "./entityHeader.utils.ts";

const alias = (name: string, records: number, first: string, last: string) => ({ name, records, first, last, differsFromAnaf: false });

describe("seapNamesSummary", () => {
  it("is null when SEAP published no spelling", () => {
    expect(seapNamesSummary([])).toBeNull();
  });

  it("adds the Records up and spans the earliest first date to the latest last date", () => {
    const summary = seapNamesSummary([alias("A", 40, "2021-03-01", "2023-01-10"), alias("B", 2, "2020-08-10", "2022-05-05")]);
    expect(summary).toEqual({ names: ["A", "B"], more: 0, records: 42, first: "2020-08-10", last: "2023-01-10" });
  });

  it("names the first few spellings and counts the rest", () => {
    const many = Array.from({ length: SEAP_NAMES_SHOWN + 2 }, (_, i) => alias(`N${i}`, 1, "2021-01-01", "2021-01-02"));
    const summary = seapNamesSummary(many)!;
    expect(summary.names).toHaveLength(SEAP_NAMES_SHOWN);
    expect(summary.more).toBe(2);
  });
});
