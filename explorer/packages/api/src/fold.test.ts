import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fold, foldTokens } from "./fold.ts";

// the same cases the Python side (watchdog/tests/test_fold.py) checks: the two folds must agree
const casesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../watchdog/tests/fixtures/fold-cases.json");
const { cases } = JSON.parse(readFileSync(casesPath, "utf8")) as { cases: { rule: string; input: string; folded: string }[] };

describe("fold (mirror of watchdog/pipeline/fold.py)", () => {
  it.each(cases.map((c) => [`${c.rule} | ${c.input}`, c.input, c.folded] as const))("%s", (_name, input, folded) => {
    expect(fold(input)).toBe(folded);
  });

  it("splits the folded text into tokens", () => {
    expect(foldTokens("Primăria Ștefan S.R.L. RO1000009")).toEqual(["primaria", "stefan", "1000009"]);
  });
});
