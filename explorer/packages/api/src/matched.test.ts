import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { foldTokens } from "./fold.ts";
import { highlightRanges, locateTokens, matchedFieldOf, type MatchSource } from "./matched.ts";

const casesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../watchdog/tests/fixtures/fold-cases.json");
const { cases } = JSON.parse(readFileSync(casesPath, "utf8")) as { cases: { input: string }[] };
const slices = (text: string, ranges: [number, number][]) => ranges.map(([a, b]) => text.slice(a, b));

describe("locateTokens", () => {
  it.each(cases.map((c) => [c.input] as const))("finds the tokens of the fold for %j", (input) => {
    expect(locateTokens(input).map((t) => t.folded)).toEqual(foldTokens(input));
  });
});

describe("highlightRanges (offsets into the original text)", () => {
  it("highlights a whole token, case and diacritics folded", () => {
    const text = "Reparații străzi Ștefan cel Mare";
    expect(slices(text, highlightRanges(text, ["stefan"]))).toEqual(["Ștefan"]);
    expect(highlightRanges(text, ["stefan"])).toEqual([[17, 23]]);
  });
  it("highlights the typed part of a prefix last token, ending on the original letter", () => {
    expect(highlightRanges("Deszăpezire străzi", ["deszapezir"])).toEqual([[0, 10]]);
    expect(highlightRanges("Deszăpezire străzi", ["desz"])).toEqual([[0, 4]]);
    expect(highlightRanges("Servicii deszăpezire", ["servicii", "desz"])).toEqual([[0, 8], [9, 13]]);
  });
  it("takes only the last token as a prefix", () => {
    expect(highlightRanges("Servicii deszapezire", ["serv", "desz"])).toEqual([[9, 13]]);
  });
  it("skips legal forms, maps a dotted one and a RO CUI to the digits", () => {
    const text = "ŞANTIER ȚARA S.R.L.";
    expect(slices(text, highlightRanges(text, ["tara"]))).toEqual(["ȚARA"]);
    expect(highlightRanges(text, ["srl"])).toEqual([]);
    const t2 = "Consumabile birou RO1000017";
    expect(slices(t2, highlightRanges(t2, ["1000017"]))).toEqual(["1000017"]);
  });
  it("handles characters outside the BMP as UTF-16 units and empty queries", () => {
    expect(highlightRanges("😀 birou", ["birou"])).toEqual([[3, 8]]);
    expect(highlightRanges("birou", [])).toEqual([]);
  });
});

describe("dotted initials glued to a word", () => {
  it("highlights like the fold tokenises", () => {
    const text = "C.N.ADMINISTRATIA PORTURILOR";
    expect(slices(text, highlightRanges(text, ["administratia"]))).toEqual(["ADMINISTRATIA"]);
    expect(slices(text, highlightRanges(text, ["cn"]))).toEqual(["C.N"]);
    expect(highlightRanges("S.C.ALFA S.R.L.", ["c"])).toEqual([]);
  });
  it("does not cut a combining mark off the end of a highlight", () => {
    const text = "cas\u0061\u0306 mare"; // "ă" decomposed
    expect(highlightRanges(text, ["casa"])).toEqual([[0, 5]]);
  });
});

describe("matchedFieldOf", () => {
  const source: MatchSource = {
    code: "DA95000008", title: "Consumabile birou RO1000017", authorityName: "SPITALUL EXEMPLU", authorityCui: "1000017",
    cpvCode: "30197000-6", cpvDescription: "Articole de papetarie",
    winners: [{ name: "PAPETARIE ALFA SA", cui: "2000007", foreignVatId: null }],
  };
  it("names the authority for a dotted prefix glued to its name", () => {
    expect(matchedFieldOf({ ...source, authorityName: "C.N.ADMINISTRATIA PORTURILOR MARITIME", title: "Lucrari" }, ["cn"])).toMatchObject({ field: "AUTHORITY", highlights: [[0, 3]] });
  });
  it("is null without a text query", () => expect(matchedFieldOf(source, [])).toBeNull());
  it("reports the field with most query tokens, then by priority", () => {
    expect(matchedFieldOf(source, ["consumabile", "birou"])).toEqual({ field: "TITLE", text: source.title, highlights: [[0, 11], [12, 17]] });
    expect(matchedFieldOf(source, ["1000017"])?.field).toBe("CUI"); // CUI before the title that also holds it
    expect(matchedFieldOf(source, ["da95000008"])?.field).toBe("PUBLIC_CODE");
    expect(matchedFieldOf(source, ["spitalul"])?.field).toBe("AUTHORITY");
    expect(matchedFieldOf(source, ["papetarie"])?.field).toBe("SUPPLIER"); // before the CPV description
    expect(matchedFieldOf(source, ["articole"])?.field).toBe("CPV_DESCRIPTION");
    expect(matchedFieldOf(source, ["3019"])).toMatchObject({ field: "CPV_CODE", highlights: [[0, 4]] });
    expect(matchedFieldOf(source, ["zzz"])).toBeNull();
  });
});
