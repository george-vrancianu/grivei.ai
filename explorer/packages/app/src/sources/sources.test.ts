import { describe, expect, it } from "vitest";
import { catalogue } from "../copy/index.ts";
import { sourceOf } from "../urlState/codec.ts";
import { asSource, NO_COUNTS, pickerOptions } from "./sourceCounts.ts";
import { coverageSourceHref, searchSourceHref } from "./sourceLinks.ts";

describe("the Source picker's options", () => {
  it("name both Sources with their own counts in their own units, never summed", () => {
    const options = pickerOptions(catalogue.en.sources, { SEAP: { n: 1204, estimated: false }, ONRC: { n: 1, estimated: false } }, "en");
    expect(options).toEqual([{ id: "SEAP", label: "SEAP", count: "1,204 Records" }, { id: "ONRC", label: "ONRC", count: "1 registration" }]);
  });

  it("mark an estimated count and speak Romanian plurals", () => {
    const options = pickerOptions(catalogue.ro.sources, { SEAP: { n: 25000, estimated: true }, ONRC: { n: 120, estimated: false } }, "ro");
    expect(options[0]?.count).toMatch(/^≈\s25\.000 de înregistrări$/);
    expect(options[1]?.count).toBe("120 de înmatriculări");
  });

  it("show the name alone without a count", () => {
    expect(pickerOptions(catalogue.en.sources, NO_COUNTS, "en")).toEqual([{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]);
  });

  it("read the control's ids back as Sources", () => {
    expect(asSource("ONRC")).toBe("ONRC");
    expect(asSource("SEAP")).toBe("SEAP");
  });
});

describe("the links between Sources", () => {
  it("go to the other Source's main screen with the query text and the lens, and leave the chips behind", () => {
    expect(searchSourceHref("en", "ONRC", { q: "alfa", lens: undefined })).toBe("/explore/?q=alfa&source=onrc");
    expect(searchSourceHref("ro", "ONRC", { q: "alfa", lens: "coverage" })).toBe("/ro/explore/?q=alfa&lens=coverage&source=onrc");
    expect(searchSourceHref("en", "SEAP", { q: "alfa" })).toBe("/explore/?q=alfa");
    expect(searchSourceHref("en", "SEAP", {})).toBe("/explore/");
    expect(sourceOf(new URL(searchSourceHref("en", "ONRC", {}), "http://x").search)).toBe("ONRC");
  });

  it("keep SEAP's Coverage page the one every earlier link means", () => {
    expect(coverageSourceHref("en", "SEAP")).toBe("/explore/coverage");
    expect(coverageSourceHref("en", "ONRC")).toBe("/explore/coverage?source=onrc");
    expect(coverageSourceHref("ro", "ONRC")).toBe("/ro/explore/coverage?source=onrc");
  });
});
