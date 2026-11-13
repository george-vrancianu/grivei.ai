import { describe, expect, it } from "vitest";
import { catalogue } from "./index.ts";

type Locale = "en" | "ro";

/** "Nothing was spent" in other words, per language. Written without diacritics: the text is folded the same way before it is matched. */
const IMPLIES_NO_SPENDING: Record<Locale, RegExp[]> = {
  en: [
    /\bnothing\b/, /\bno (public )?(spending|spend|money|funds|purchases?|contracts?|procurement)\b/, /\bzero\b/, /\bnever (spent|bought)\b/,
    /\b(not|n't) (spent|spend|bought|buy|purchased)\b/, /\b(spent|bought|purchased) (nothing|zero)\b/, /\b0(?:[.,]0+)? ?(ron|lei)\b/, /\b(ron|lei) ?0(?:[.,]0+)?(?![\d.,])/, /\bwithout (any )?(spending|purchases?)\b/,
  ],
  ro: [
    /\bnimic\b/, /\bnicio (cheltuiala|achizitie|plata|suma)\b/, /\bfara (cheltuieli|cheltuiala|achizitii|bani|plati)\b/, /\bzero\b/,
    /\bnu (s-a|s-au|a|au|am|se a|se au) (cheltuit|cumparat|achizitionat|platit)\b/, /\bn-(a|au) (cheltuit|cumparat|achizitionat|platit)\b/, /\bnu exista (cheltuieli|achizitii|plati)\b/,
    /\b0(?:[.,]0+)? ?(ron|lei)\b/, /\b(ron|lei) ?0(?:[.,]0+)?(?![\d.,])/,
  ],
};

/** The patterns an empty-state string breaks; text is folded (lower case, no diacritics) so "cumpărat" and "cumparat" are the same. */
function impliesNoSpending(text: string, locale: Locale): string[] {
  const folded = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return IMPLIES_NO_SPENDING[locale].filter((pattern) => pattern.test(folded)).map(String);
}

/** Every sentence the empty state of the result tabs and of the full-results view says: the message per tab and the link. */
function emptyStateTexts(locale: Locale): string[] {
  const { results } = catalogue[locale];
  return [...Object.values(results.empty), results.emptyLink];
}

describe("the guard against wording that implies no spending", () => {
  it.each([
    ["en", "Nothing was spent here"],
    ["en", "No spending in this county"],
    ["en", "No money was spent in 2023"],
    ["en", "RON 0 spent"],
    ["en", "0 RON"],
    ["en", "The county never spent anything"],
    ["ro", "Nu s-a cheltuit nimic"],
    ["ro", "Nu s-a cumpărat nimic aici"],
    ["ro", "Nu s-a cumparat nimic aici"],
    ["ro", "Nicio cheltuială în acest județ"],
    ["ro", "Nicio cheltuiala in acest judet"],
    ["ro", "Fără cheltuieli"],
    ["ro", "Fara cheltuieli"],
    ["ro", "0 lei"],
  ] as const)("rejects %s: %s", (locale, text) => {
    expect(impliesNoSpending(text, locale), text).not.toEqual([]);
  });

  it.each([
    ["en", "No Records match."],
    ["en", "Check what has been harvested"],
    ["ro", "Nicio înregistrare nu corespunde."],
    ["ro", "Verifică ce a fost colectat"],
  ] as const)("lets %s through: %s", (locale, text) => {
    expect(impliesNoSpending(text, locale), text).toEqual([]);
  });
});

describe.each(["en", "ro"] as const)("the empty state of the result tabs (%s)", (locale) => {
  it("keeps its message and says what the link is for", () => {
    const { results } = catalogue[locale];
    expect(results.empty.records).toBe(locale === "en" ? "No Records match." : "Nicio înregistrare nu corespunde.");
    expect(results.emptyLink.trim()).not.toBe("");
  });

  it("never says or suggests that nothing was spent, in the message or the link", () => {
    for (const text of emptyStateTexts(locale)) expect(impliesNoSpending(text, locale), text).toEqual([]);
  });

  it("writes the link with diacritics in Romanian, never the cedilla forms", () => {
    const { emptyLink } = catalogue[locale].results;
    if (locale === "ro") expect(emptyLink).toMatch(/[ăâîșț]/);
    expect(emptyLink).not.toMatch(/[şţ]/);
  });
});
