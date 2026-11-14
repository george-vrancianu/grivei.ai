import { describe, expect, it } from "vitest";
import { foldTokens } from "./fold.ts";
import { onrcMatchedFields } from "./onrcMatched.ts";

const source = { name: "BETA NOU SRL", aliases: ["BETA VECHI SRL", "ȘANTIER BETA SRL"], cui: "3100039", registrationNumber: "J40/1002/2012", caen: [{ code: "4321" }, { code: "4322" }] };
const match = (q: string) => onrcMatchedFields(source, foldTokens(q));

describe("why an ONRC registration matched", () => {
  it("says nothing without a text query", () => {
    expect(match("")).toEqual([]);
    expect(match("SRL")).toEqual([]); // a legal form folds to nothing
  });

  it("names the registered name and highlights the word", () => {
    expect(match("nou")).toEqual([{ field: "NAME", text: "BETA NOU SRL", highlights: [[5, 8]] }]);
  });

  it("names an earlier name (an alias) with the ranges in its own text, the field holding most query words first", () => {
    expect(match("beta vechi")).toEqual([
      { field: "ALIAS", text: "BETA VECHI SRL", highlights: [[0, 4], [5, 10]] },
      { field: "NAME", text: "BETA NOU SRL", highlights: [[0, 4]] },
      { field: "ALIAS", text: "ȘANTIER BETA SRL", highlights: [[8, 12]] },
    ]);
  });

  it("maps a diacritic back to the original character", () => {
    expect(match("santier")).toEqual([{ field: "ALIAS", text: "ȘANTIER BETA SRL", highlights: [[0, 7]] }]);
  });

  it("names the CUI (also RO-prefixed), the registration number and a CAEN code, a prefix included", () => {
    expect(match("RO3100039")).toEqual([{ field: "CUI", text: "3100039", highlights: [[0, 7]] }]);
    expect(match("j40/1002/2012")).toEqual([{ field: "REGISTRATION_NUMBER", text: "J40/1002/2012", highlights: [[0, 3], [4, 8], [9, 13]] }]);
    expect(match("432")).toEqual([{ field: "CAEN", text: "4321", highlights: [[0, 3]] }, { field: "CAEN", text: "4322", highlights: [[0, 3]] }]);
  });

  it("reports no field for a word none holds", () => {
    expect(match("gamma")).toEqual([]);
  });
});
