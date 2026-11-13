import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { plainMethodologyText, type MethodologyText } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { ro } from "./ro.ts";
import { methodologyEn } from "./methodologyEn.ts";
import { methodologyRo } from "./methodologyRo.ts";

/** The Romanian copy as one string; items with amounts (a `build` function) are read as plain text, since JSON would drop them. */
const text = JSON.stringify(methodologyRo, (_key, value: unknown) => (value && typeof value === "object" && "build" in value ? plainMethodologyText(value as MethodologyText) : value));

describe("the Romanian methodology copy quotes the Romanian UI's own labels", () => {
  it("names the badges as the badges read", () => {
    expect(text).toContain(`„${ro.badges.CRAWL_ONLY.label}”`);
    expect(text).toContain(`„${ro.badges.CRAWLED_PROVISIONAL.label}”`);
    expect(text).toContain(`„${ro.badges.IDENTITY_CURATED.label}”`);
  });

  it("uses the catalogue's term for bulk data and tiles", () => {
    expect(text).not.toMatch(/în bloc|tab separat|Verificat manual/);
  });
});

describe("the money figures in the methodology prose follow the counting rule", () => {
  const counting = readFileSync(fileURLToPath(new URL("../../../../../watchdog/pipeline/counting.py", import.meta.url)), "utf8");
  /** A Python integer literal with underscores and an optional `* RON` factor (bani per RON = 100), in bani. */
  const bani = (expr: string): string => String(BigInt(expr.replace(/_/g, "")) * 100n);
  const caps = [...counting.matchAll(/Cap\(date\([^)]*\), ([\d_]+) \* RON, ([\d_]+) \* RON\)/g)].map((m) => [bani(m[1]!), bani(m[2]!)] as const);
  const constant = (name: string) => bani(new RegExp(`^${name} = ([\\d_]+) \\* RON`, "m").exec(counting)![1]!);

  it("reads the caps and thresholds from counting.py", () => {
    expect(caps).toHaveLength(2);
  });

  it.each([
    ["en", methodologyEn],
    ["ro", methodologyRo],
  ] as const)("quotes exactly those amounts, as money, in %s", (_locale, copy) => {
    const amounts = (items: readonly MethodologyText[] | undefined) => (items ?? []).flatMap((item) => (typeof item === "string" ? [] : item.bani));
    const oldCaps = caps[0]!;
    const newCaps = caps[1]!;
    const capFigures = [oldCaps[0], oldCaps[1], newCaps[0], newCaps[1]];
    expect(amounts(copy.sections.suspectValues.items)).toEqual([...capFigures, constant("CONTRACT_CHECK_FROM"), constant("CONTRACT_NO_ESTIMATE_ABOVE")]);
    expect(amounts(copy.rules.OVER_CAP.items)).toEqual(capFigures);
  });

  it("leaves no amount as plain digits followed by RON in the prose", () => {
    for (const copy of [methodologyEn, methodologyRo]) {
      const plain = [...Object.values(copy.sections), copy.signals, ...Object.values(copy.rules)].flatMap((s) => [...s.paragraphs, ...(s.items ?? []).filter((i): i is string => typeof i === "string")]);
      for (const text of plain) expect(text, text).not.toMatch(/\d[\d.,]*\s*(RON|miliard)/);
    }
  });
});
