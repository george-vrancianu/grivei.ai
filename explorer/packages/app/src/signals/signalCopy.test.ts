import { forbiddenWords, ruleTexts, SIGNAL_RULES, type Locale, type SignalNumberTexts } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { catalogue } from "../copy/index.ts";

/** Numbers the sentences are filled with; 25 purchases, so Romanian counts take "de". */
const numbers: SignalNumberTexts = {
  OVER_CAP: { value: "300.000,00 RON", cap: "270.120,00 RON", multiple: "1,11" },
  SPLITTING: { purchasesCount: 25, purchases: "25", sum: "290.000,00 RON", cap: "270.120,00 RON", cpvGroup: "770", from: "1 iulie 2024", to: "19 iulie 2024" },
  FRAMEWORK_OVERRUN: { ceiling: "100.000.000,00 RON", subsequent: "112.400.000,00 RON", ratio: "112,4%" },
  NO_PUBLICATION: { procedure: "Negociere fără publicare prealabilă" },
};

/** Every string the Signal card and its compact form can say, with sample numbers: the rules' label, filled sentence and lawful line, then the rest of the card's copy. */
function signalTexts(locale: Locale): string[] {
  const { rules, parties, ...rest } = catalogue[locale].signalCard;
  const out: string[] = [...ruleTexts(rules, numbers)];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") out.push((value as (a: number, b: string) => string)(2, "2"));
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(rest);
  walk({ authority: parties.authority, suppliers: parties.suppliers, moreSuppliers: parties.moreSuppliers }); // the entity-link markers are the catalogue's own, not Signal copy
  return out;
}

describe.each(["en", "ro"] as const)("the Signal wording catalogue (%s)", (locale) => {
  it("has a label, a sentence and a lawful-explanations line for each of the four rules", () => {
    expect(Object.keys(catalogue[locale].signalCard.rules).sort()).toEqual([...SIGNAL_RULES].sort());
    expect(ruleTexts(catalogue[locale].signalCard.rules, numbers)).toHaveLength(12);
  });

  it("never says suspect, fraud, irregular, illegal or risk (nor the Romanian equivalents), in any part", () => {
    const texts = signalTexts(locale);
    expect(texts.length).toBeGreaterThan(20);
    for (const text of texts) expect(forbiddenWords(text, locale), text).toEqual([]);
  });

  it("counts 20 or more in Romanian with \"de\"", () => {
    if (locale !== "ro") return;
    const { rules, links } = catalogue.ro.signalCard;
    expect(rules.SPLITTING.sentence(numbers.SPLITTING)).toMatch(/^25 de achiziții directe/);
    expect(links.reproduce(25, "25")).toBe("Vezi cele 25 de înregistrări");
    expect(links.reproduce(13, "13")).toBe("Vezi cele 13 înregistrări");
  });

  it("writes Romanian with diacritics, never the cedilla forms", () => {
    if (locale === "ro") expect(signalTexts("ro").join(" ")).toMatch(/[ăâîșț]/);
    expect(signalTexts(locale).join(" ")).not.toMatch(/[şţ]/);
  });
});

describe.each(["en", "ro"] as const)("one name and one lawful line per Signal rule (%s)", (locale) => {
  const c = catalogue[locale];

  it("calls a rule the same on the card, the Records tab's facet, the Record page and the methodology page", () => {
    for (const rule of SIGNAL_RULES) {
      const label = c.signalCard.rules[rule].label;
      expect(c.entityPage.recordsTab.facets.signals[rule]).toBe(label);
      expect(c.recordPage.signals.rules[rule]).toBe(label);
      expect(c.methodology.rules[rule].heading).toBe(label);
    }
  });

  it("says the lawful explanations of a rule the same on the card and on the methodology page", () => {
    for (const rule of SIGNAL_RULES) expect(c.methodology.rules[rule].lawful, rule).toBe(c.signalCard.rules[rule].lawful);
  });
});

describe.each(["en", "ro"] as const)("the \"n Signals\" chip of an entity row (%s)", (locale) => {
  const label = catalogue[locale].results.entityRow.signals.label;

  it("never says suspect, fraud, irregular, illegal or risk (nor the Romanian equivalents)", () => {
    for (const n of [1, 2, 19, 20, 25, 101]) expect(forbiddenWords(label(n, String(n)), locale), String(n)).toEqual([]);
  });

  it("takes the language's plural form", () => {
    if (locale === "en") expect([1, 2].map((n) => label(n, String(n)))).toEqual(["1 Signal", "2 Signals"]);
    else expect([1, 2, 19, 20, 25, 101].map((n) => label(n, String(n)))).toEqual(["1 Semnal", "2 Semnale", "19 Semnale", "20 de Semnale", "25 de Semnale", "101 Semnale"]);
  });
});
