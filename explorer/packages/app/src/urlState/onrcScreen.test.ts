import { describe, expect, it } from "vitest";
import { applyOnrcPatch, decodeOnrcScreen, encodeOnrcScreen, patchToOnrc } from "./onrcScreen.ts";

const roundTrip = (query: string) => encodeOnrcScreen(decodeOnrcScreen(`?${query}`));

describe("the ONRC screen's URL state", () => {
  const everything = "q=alfa&status=1048&status=1107&caen=42&county=RO-CJ&registeredFrom=2020-01-01&registeredTo=2024-12-31&seapCounterparty=false&page=3&lens=coverage&source=onrc";

  it("round-trips every chip, the page and the lens, with source=onrc last", () => {
    expect(roundTrip(everything)).toBe(`?${everything}`);
  });

  it("always names the Source, since that is what makes the URL ONRC's, and leaves the default lens and page 1 out", () => {
    expect(encodeOnrcScreen({ filter: {} })).toBe("?source=onrc");
    expect(encodeOnrcScreen({ filter: { q: "a" }, lens: "money", page: 1 })).toBe("?q=a&source=onrc");
  });

  it("reads a SEAP chip as nothing, so an ONRC URL never carries one", () => {
    expect(decodeOnrcScreen("?source=onrc&channel=contract&from=2024-01-01&q=alfa")).toEqual({ filter: { q: "alfa" } });
  });

  it("merges a patch field by field, removes a field set to undefined and starts at page 1 when the filter changes", () => {
    const state = decodeOnrcScreen(`?${everything}`);
    expect(applyOnrcPatch(state, { filter: { caen: undefined, status: [1084] } })).toEqual({ filter: { q: "alfa", status: [1084], county: "RO-CJ", registeredFrom: "2020-01-01", registeredTo: "2024-12-31", seapCounterparty: false }, lens: "coverage" });
    expect(applyOnrcPatch(state, { lens: undefined }).lens).toBeUndefined();
    expect(applyOnrcPatch(state, { filter: { q: "b" }, page: 2 }).page).toBe(2);
  });

  it("lands the filter exactly on the next one", () => {
    expect(patchToOnrc({ q: "a", status: [1048], caen: "42" }, { q: "a", caen: "4211" })).toEqual({ q: "a", status: undefined, caen: "4211" });
  });
});
