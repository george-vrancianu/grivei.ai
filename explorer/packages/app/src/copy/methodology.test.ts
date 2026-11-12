import { describe, expect, it } from "vitest";
import { ro } from "./ro.ts";
import { methodologyRo } from "./methodologyRo.ts";

const text = JSON.stringify(methodologyRo);

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
