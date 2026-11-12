import type { SignalData, SignalRule } from "../types.ts";
import type { Locale } from "../../theme/index.ts";
import { formatMoney } from "../atoms/MoneyAmount/index.ts";
import { formatDate } from "./formatDate.ts";
import { formatPercent } from "./formatPercent.ts";

/** What each rule's sentence gets: the Signal's numbers already formatted for the reader (money, dates, ratios in the locale; procedure and CPV group as published). */
export interface SignalNumberTexts {
  OVER_CAP: { value: string; cap: string; multiple: string };
  SPLITTING: { purchases: string; sum: string; cap: string; cpvGroup: string; from: string; to: string };
  FRAMEWORK_OVERRUN: { ceiling: string; subsequent: string; ratio: string };
  NO_PUBLICATION: { procedure: string };
}

/** One rule's wording: a neutral label, one sentence with the numbers filled in, and one line on the lawful explanations. */
export interface SignalRuleCopy<R extends SignalRule> {
  label: string;
  sentence: (numbers: SignalNumberTexts[R]) => string;
  lawful: string;
}

export type SignalRulesCopy = { [R in SignalRule]: SignalRuleCopy<R> };

export const SIGNAL_RULES: readonly SignalRule[] = ["OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION"];

const decimals = (value: number, locale: Locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

/** The numbers of a Signal as text for its rule's sentence. Money is exact (bani shown), dates are long, the multiple has two decimals at most. */
export function signalNumberTexts(numbers: SignalData["numbers"], locale: Locale): { [R in SignalRule]: { rule: R; texts: SignalNumberTexts[R] } }[SignalRule] {
  const money = (bani: string) => formatMoney(bani, locale, { showBani: true });
  switch (numbers.__typename) {
    case "OverCapNumbers":
      return { rule: "OVER_CAP", texts: { value: money(numbers.value), cap: money(numbers.cap), multiple: decimals(numbers.multiple, locale) } };
    case "SplittingNumbers":
      return {
        rule: "SPLITTING",
        texts: {
          purchases: new Intl.NumberFormat(locale).format(numbers.purchases), sum: money(numbers.sum), cap: money(numbers.cap), cpvGroup: numbers.cpvGroup,
          from: formatDate(numbers.from, locale, "long"), to: formatDate(numbers.to, locale, "long"),
        },
      };
    case "FrameworkOverrunNumbers":
      return { rule: "FRAMEWORK_OVERRUN", texts: { ceiling: money(numbers.ceiling), subsequent: money(numbers.subsequent), ratio: formatPercent(numbers.ratio, locale) } };
    case "NoPublicationNumbers":
      return { rule: "NO_PUBLICATION", texts: { procedure: numbers.procedure } };
  }
}

/** The Signal's one-sentence wording, its numbers filled in from `numbers` (the rule of the sentence is the numbers' own type, so they cannot disagree). */
export function signalSentence(signal: Pick<SignalData, "numbers">, locale: Locale, rules: SignalRulesCopy): string {
  const filled = signalNumberTexts(signal.numbers, locale);
  switch (filled.rule) {
    case "OVER_CAP":
      return rules.OVER_CAP.sentence(filled.texts);
    case "SPLITTING":
      return rules.SPLITTING.sentence(filled.texts);
    case "FRAMEWORK_OVERRUN":
      return rules.FRAMEWORK_OVERRUN.sentence(filled.texts);
    case "NO_PUBLICATION":
      return rules.NO_PUBLICATION.sentence(filled.texts);
  }
}

// ---- the neutral-wording guard -------------------------------------------------------------------------------------------------------

/** Stems of the words a Signal's copy never uses (stripped of diacritics, lower case): a Signal states a pattern, it does not accuse. */
export const FORBIDDEN_STEMS: Record<Locale, RegExp> = {
  en: /suspect|suspicio|fraud|irregular|illegal|unlawful|risk/,
  ro: /suspect|suspici|fraud|nereg|ilegal|nelegal|risc/,
};

const stripDiacritics = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The forbidden stems found in a text (empty when it is neutral). Reads the text in the given language, so "risc" is found in Romanian and "risk" in English. */
export function forbiddenWords(text: string, locale: Locale): string[] {
  const plain = stripDiacritics(text);
  const found = new RegExp(FORBIDDEN_STEMS[locale].source, "g");
  return [...plain.matchAll(found)].map((m) => m[0]);
}

/** Sample numbers every rule's sentence is rendered with in the guard test and in stories. */
export const SAMPLE_NUMBER_TEXTS: SignalNumberTexts = {
  OVER_CAP: { value: "RON 300,000.00", cap: "RON 270,120.00", multiple: "1.11" },
  SPLITTING: { purchases: "2", sum: "RON 290,000.00", cap: "RON 270,120.00", cpvGroup: "770", from: "1 July 2024", to: "19 July 2024" },
  FRAMEWORK_OVERRUN: { ceiling: "RON 100,000,000.00", subsequent: "RON 112,400,000.00", ratio: "112.4%" },
  NO_PUBLICATION: { procedure: "Negociere fără publicare prealabilă" },
};

/** Every wording of the rules (label, filled sentence, lawful line) as plain strings: what the guard reads. */
export function ruleTexts(rules: SignalRulesCopy): string[] {
  return [
    ...(["OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION"] as const).flatMap((rule) => {
      const copy = rules[rule];
      const sentence = (copy.sentence as (n: SignalNumberTexts[typeof rule]) => string)(SAMPLE_NUMBER_TEXTS[rule]);
      return [copy.label, sentence, copy.lawful];
    }),
  ];
}
