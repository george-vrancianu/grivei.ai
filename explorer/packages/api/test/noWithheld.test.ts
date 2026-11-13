// Guard (ADR 0003 as amended): natural persons' names live in the `withheld` schema and the API never reads it.
// Fails if any source file under src/ mentions the schema or its table.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("the API never reads the withheld schema", () => {
  it("has source files to scan", () => {
    expect(files(SRC).length).toBeGreaterThan(5);
  });

  it("mentions neither `withheld` nor `natural_person_name` anywhere under src/", () => {
    const hits = files(SRC).filter((f) => /withheld|natural_person_name/i.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
