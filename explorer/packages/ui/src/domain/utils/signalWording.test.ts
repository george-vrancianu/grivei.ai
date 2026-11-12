import { describe, expect, it } from "vitest";
import { sampleCopy } from "../samples/copy.ts";
import { signalSamples } from "../samples/signals.ts";
import { forbiddenWords, ruleTexts, signalNumberTexts, signalSentence, SIGNAL_RULES } from "./signalWording.ts";

describe("the neutral-wording checker", () => {
  it("finds an accusing word in English, in any inflection and case", () => {
    expect(forbiddenWords("A SUSPECTED fraud, an irregularity: risky and illegal", "en")).toEqual(["suspect", "fraud", "irregular", "risk", "illegal"]);
    expect(forbiddenWords("unlawful", "en")).toEqual(["unlawful"]);
  });

  it("finds an accusing word in Romanian, with or without diacritics", () => {
    expect(forbiddenWords("Achiziție suspectă, suspiciune, fraudă, neregulă, ilegală, nelegal, riscant, risc", "ro")).toEqual([
      "suspect", "suspici", "fraud", "nereg", "ilegal", "nelegal", "risc", "risc",
    ]);
    expect(forbiddenWords("FRAUDĂ ȘI NEREGULĂ", "ro")).toEqual(["fraud", "nereg"]);
  });

  it("passes the neutral words the Signals use", () => {
    expect(forbiddenWords("Possible lawful explanations: indexation, an emergency, another legal ground.", "en")).toEqual([]);
    expect(forbiddenWords("Explicații legale posibile: urgența, un temei legal.", "ro")).toEqual([]);
  });
});

describe("the sample wording of every rule", () => {
  it.each(["en", "ro"] as const)("has no accusing word in %s (label, sentence, lawful line)", (locale) => {
    const texts = ruleTexts(sampleCopy.signalCard(locale).rules);
    expect(texts).toHaveLength(12);
    for (const text of texts) expect(forbiddenWords(text, locale), text).toEqual([]);
  });
});

describe("filling a sentence from the Signal's numbers", () => {
  it("reads each rule's numbers in the locale: money with bani, dates long, ratio as a percentage", () => {
    expect(signalNumberTexts(signalSamples.OVER_CAP.numbers, "ro")).toEqual({ rule: "OVER_CAP", texts: { value: "300.000,00\u00a0RON", cap: "270.120,00\u00a0RON", multiple: "1,11" } });
    expect(signalNumberTexts(signalSamples.FRAMEWORK_OVERRUN.numbers, "en")).toMatchObject({ texts: { ratio: "112.4%", ceiling: "RON\u00a0100,000,000.00" } });
  });

  it("uses the sentence of the rule whose numbers it was given", () => {
    for (const rule of SIGNAL_RULES) {
      const sentence = signalSentence(signalSamples[rule], "en", sampleCopy.signalCard("en").rules);
      expect(sentence.length).toBeGreaterThan(20);
    }
  });
});
