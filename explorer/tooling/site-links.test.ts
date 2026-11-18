import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const site = (file: string) => readFileSync(resolve(import.meta.dirname, "../../site", file), "utf8");

describe("the landing page links to the explorer", () => {
  it("the English page carries the /explore/ link (hidden until the explorer opens)", () => {
    expect(site("index.html")).toMatch(/<a class="explore-link" href="\/explore\/"[^>]*>/);
  });

  it("the Romanian page carries the /ro/explore/ link (hidden until the explorer opens)", () => {
    expect(site("ro/index.html")).toMatch(/<a class="explore-link" href="\/ro\/explore\/"[^>]*>/);
  });
});
