import { describe, expect, expectTypeOf, it } from "vitest";
import { VALUE_BUCKETS } from "@grivei/contract";
import { RECORD_BADGES, type BadgeCopy } from "@grivei/ui";
import { catalogue } from "./index.ts";
import type { Copy } from "./types.ts";

/** Every path to a leaf of the catalogue, e.g. `pages.notFound.title`. */
function leaves(value: unknown, path = ""): Map<string, "string" | "function"> {
  const out = new Map<string, "string" | "function">();
  if (typeof value === "string") {
    out.set(path, "string");
  } else if (typeof value === "function") {
    out.set(path, "function");
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) for (const [p, kind] of leaves(child, path ? `${path}.${key}` : key)) out.set(p, kind);
  } else {
    throw new Error(`${path}: a catalogue holds strings and functions only`);
  }
  return out;
}

describe("the copy catalogue", () => {
  it("is typed per language by the same Copy shape (a missing key does not compile)", () => {
    expectTypeOf(catalogue.en).toEqualTypeOf<Copy>();
    expectTypeOf(catalogue.ro).toEqualTypeOf<Copy>();
  });

  it("has the same keys in English and Romanian, nothing missing either way", () => {
    const en = leaves(catalogue.en);
    const ro = leaves(catalogue.ro);
    expect([...en.keys()].filter((k) => !ro.has(k)), "missing in ro").toEqual([]);
    expect([...ro.keys()].filter((k) => !en.has(k)), "missing in en").toEqual([]);
    for (const [path, kind] of en) expect(ro.get(path), path).toBe(kind);
  });

  it.each(["en", "ro"] as const)("has no empty string in %s", (locale) => {
    const empty: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string" && value.trim() === "") empty.push(path);
      else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    };
    walk(catalogue[locale], locale);
    expect(empty).toEqual([]);
  });

  it.each(["en", "ro"] as const)("explains every badge in %s", (locale) => {
    expectTypeOf(catalogue[locale].badges).toEqualTypeOf<BadgeCopy>();
    expect(Object.keys(catalogue[locale].badges).sort()).toEqual([...RECORD_BADGES].sort());
  });

  it("really is Romanian in Romanian: the same text is not reused for the sentences", () => {
    for (const path of ["pages.notFound.title", "status.failed", "main.title", "results.empty.records"]) {
      expect(leaves(catalogue.ro).has(path)).toBe(true);
      const get = (c: Copy) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], c);
      expect(get(catalogue.ro), path).not.toBe(get(catalogue.en));
    }
  });

  it("uses Romanian comma-below diacritics, never the cedilla forms", () => {
    const text = JSON.stringify(catalogue.ro, (_k, v: unknown) => (typeof v === "function" ? String(v) : v));
    expect(text).not.toMatch(/[şŞţŢ]/);
  });
});

describe("Romanian counts", () => {
  const f = (n: number) => catalogue.ro.total.records(n, String(n));
  it("uses the singular for 1, plain plural for 0 and 2..19 mod 100, and 'de' otherwise", () => {
    expect([0, 1, 5, 19, 20, 101, 119, 120, 410000].map(f)).toEqual([
      "0 înregistrări", "1 înregistrare", "5 înregistrări", "19 înregistrări", "20 de înregistrări", "101 înregistrări", "119 înregistrări", "120 de înregistrări", "410000 de înregistrări",
    ]);
  });
  it("puts 'de' before the noun phrase for the other counts too", () => {
    expect(catalogue.ro.total.suspectLeftOut(20, "20")).toBe("20 de valori suspecte excluse");
    expect(catalogue.ro.total.noValue(3, "3")).toBe("3 înregistrări fără valoare");
  });
});

describe("Romanian consortium size", () => {
  const of = (n: number) => catalogue.ro.recordPage.parties.consortiumOf(n, String(n));
  it("takes 'de' before the plural from 20 up, as every other Romanian count does", () => {
    expect(of(6)).toBe("consorțiu de 6 membri");
    expect(of(20)).toBe("consorțiu de 20 de membri");
  });
});

/** The RON edge as the copy writes it: grouped digits, or "1 bn"/"1 mld." for a billion. */
const ron = (bani: string, locale: "en" | "ro"): string => {
  const n = BigInt(bani) / 100n;
  if (n === 1_000_000_000n) return locale === "en" ? "1 bn" : "1 mld.";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, locale === "en" ? "," : ".");
};

describe.each(["en", "ro"] as const)("value bucket labels (%s)", (locale) => {
  it("name the band's edges from VALUE_BUCKETS: lower edge (the previous bucket's) and inclusive upper edge", () => {
    const options = catalogue[locale].filterChips.valueBucket.options;
    VALUE_BUCKETS.forEach((edge, i) => {
      const label = options[edge.bucket];
      const lower = i === 0 ? null : (VALUE_BUCKETS[i - 1]?.upToBani ?? null);
      if (lower !== null) expect(label, `${edge.bucket} lower`).toContain(ron(lower, locale));
      if (edge.upToBani !== null) expect(label, `${edge.bucket} upper`).toContain(ron(edge.upToBani, locale));
    });
  });
});

describe.each(["en", "ro"] as const)("the Coverage copy (%s, #90)", (locale) => {
  const { grid, rules } = catalogue[locale].coverage;
  const lens = catalogue[locale].coverageLensMap;
  it("has words for every gap state and every gap rule, for NOT_YET_LOADED with and without AWAITING_BULK_FILE, and for every coverage status", () => {
    expect(Object.keys(grid.states).sort()).toEqual(["CRAWLED_PROVISIONAL", "KNOWN_GAP", "LOADED", "NOT_IN_SOURCE", "NOT_YET_LOADED", "POSSIBLY_INCOMPLETE"]);
    expect(Object.keys(grid.rules).sort()).toEqual(["AWAITING_BULK_FILE", "COUNT_BELOW_NEIGHBOURS", "HAND_ENTERED", "NO_PRIOR_CALL_BEFORE_BACKFILL"]);
    expect(Object.keys(rules.names).sort()).toEqual(Object.keys(grid.rules).sort());
    expect(Object.keys(lens.status).sort()).toEqual(["HARVESTED", "HARVESTED_WITH_KNOWN_GAPS", "NOT_HARVESTED", "PARTIAL"]);
    for (const text of [...Object.values(grid.states), ...Object.values(grid.rules), ...Object.values(rules.names), ...Object.values(lens.status), grid.notYetLoaded, lens.noStatus]) expect(text.trim()).not.toBe("");
    // a quarantined file and a file still to come both read as "not yet loaded"; the rule's own wording only explains the second
    expect(grid.notYetLoaded).not.toBe(grid.rules.AWAITING_BULK_FILE);
  });
});
