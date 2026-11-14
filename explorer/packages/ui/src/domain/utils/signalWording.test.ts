import { describe, expect, it } from "vitest";
import { sampleCopy } from "../samples/copy.ts";
import { sampleNumberTexts, signalSamples } from "../samples/signals.ts";
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
    const texts = ruleTexts(sampleCopy.signalCard(locale).rules, sampleNumberTexts);
    expect(texts).toHaveLength(36);
    for (const text of texts) expect(forbiddenWords(text, locale), text).toEqual([]);
  });
});

describe("the checker across languages", () => {
  it("finds an English word left in Romanian copy, and a Romanian one in English copy", () => {
    expect(forbiddenWords("A risk, illegal and irregular", "ro")).toEqual(["risk", "illegal", "irregular"]);
    expect(forbiddenWords("Achiziție suspectă", "en")).toEqual(["suspect"]);
  });
});

describe("the percentage of a framework overrun", () => {
  it("never rounds up to the 110% the rule fires above", () => {
    const text = (ratio: number) => {
      const filled = signalNumberTexts({ __typename: "FrameworkOverrunNumbers", ceiling: "100", subsequent: "110", ratio }, "en");
      return "ratio" in filled.texts ? filled.texts.ratio : "";
    };
    expect(text(1.1004)).toBe("110.04%");
    expect(text(1.1999)).toBe("119.99%");
    expect(text(1.124)).toBe("112.4%");
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

describe("the ONRC and financial-statement rules' sentences (#184)", () => {
  const rules = (locale: "en" | "ro") => sampleCopy.signalCard(locale).rules;

  it("reads their numbers in the locale: counts grouped, years plain, dates long, money with bani", () => {
    expect(signalNumberTexts(signalSamples.AFTER_STRIKE_OFF.numbers, "en")).toEqual({ rule: "AFTER_STRIKE_OFF", texts: { struckOff: "11 October 2022", daysAfter: "599", daysAfterCount: 599 } });
    expect(signalNumberTexts(signalSamples.NO_FINANCIAL_STATEMENT.numbers, "ro")).toMatchObject({ texts: { fiscalYear: "2023", previousYear: "2022", legalForm: "SA" } });
    expect(signalNumberTexts(signalSamples.FEW_EMPLOYEES.numbers, "en")).toMatchObject({ texts: { employees: "1", awarded: "RON 5,400,000.00" } });
  });

  it("says the insolvency status is undated, and says \"possibly older\" only for the earliest snapshot", () => {
    const first = signalSentence(signalSamples.INSOLVENCY, "en", rules("en"));
    expect(first).toContain("The status is undated");
    expect(first).not.toContain("possibly older");
    const earliest = { numbers: { ...signalSamples.INSOLVENCY.numbers, sinceAtLeast: true } } as typeof signalSamples.INSOLVENCY;
    expect(signalSentence(earliest, "en", rules("en"))).toContain("possibly older");
    expect(signalSentence(earliest, "ro", rules("ro"))).toContain("Starea nu este datată");
  });

  it("takes the singular for one day and one employee, in both languages", () => {
    const young = { numbers: { __typename: "YoungFirmNumbers", days: 1, registered: "2024-03-01", counted: null } } as typeof signalSamples.YOUNG_FIRM;
    expect(signalSentence(young, "en", rules("en"))).toContain("1 day after");
    expect(signalSentence(young, "ro", rules("ro"))).toContain("1 zi după");
    expect(signalSentence(signalSamples.FEW_EMPLOYEES, "en", rules("en"))).toContain("1 average employee ");
    expect(signalSentence(signalSamples.FEW_EMPLOYEES, "ro", rules("ro"))).toContain("1 angajat");
  });
});
