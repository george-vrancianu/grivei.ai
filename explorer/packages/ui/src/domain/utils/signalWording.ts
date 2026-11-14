import type { SignalData, SignalRule } from "../types.ts";
import type { Locale } from "../../theme/index.ts";
import { formatMoney } from "../atoms/MoneyAmount/index.ts";
import { formatDate } from "./formatDate.ts";

/** What each rule's sentence gets: the Signal's numbers already formatted for the reader (money, dates, ratios in the locale; procedure and CPV group as published). */
export interface SignalNumberTexts {
  OVER_CAP: { value: string; cap: string; multiple: string };
  SPLITTING: { purchasesCount: number; purchases: string; sum: string; cap: string; cpvGroup: string; from: string; to: string };
  FRAMEWORK_OVERRUN: { ceiling: string; subsequent: string; ratio: string };
  NO_PUBLICATION: { procedure: string };
  YOUNG_FIRM: { days: string; daysCount: number; registered: string };
  NO_CONSTRUCTION_CAEN: { value: string; codes: string; codesCount: number };
  AFTER_STRIKE_OFF: { struckOff: string; daysAfter: string; daysAfterCount: number };
  /** `status` as ONRC names it (source data); the status is undated, `firstSeen` is the snapshot it first showed in, `sinceAtLeast` when that is the earliest snapshot held. */
  INSOLVENCY: { status: string; firstSeen: string; sinceAtLeast: boolean };
  FEW_EMPLOYEES: { fiscalYear: string; employees: string; employeesCount: number; awarded: string };
  NO_FINANCIAL_STATEMENT: { fiscalYear: string; previousYear: string; awarded: string; legalForm: string };
}

/** One rule's wording: a neutral label, one sentence with the numbers filled in, and one line on the lawful explanations. */
export interface SignalRuleCopy<R extends SignalRule> {
  label: string;
  sentence: (numbers: SignalNumberTexts[R]) => string;
  lawful: string;
}

export type SignalRulesCopy = { [R in SignalRule]: SignalRuleCopy<R> };

export const SIGNAL_RULES: readonly SignalRule[] = [
  "OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION", "YOUNG_FIRM", "NO_CONSTRUCTION_CAEN", "AFTER_STRIKE_OFF", "INSOLVENCY", "FEW_EMPLOYEES", "NO_FINANCIAL_STATEMENT",
];

/** A ratio as a percentage, cut (not rounded) at two decimals: 1.1004 reads "110.04%", never a rounded "110%" on a rule that fires above 110%. */
const ratioPercent = (ratio: number, locale: Locale) =>
  new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2, roundingMode: "trunc" }).format(ratio);

const count = (value: number, locale: Locale) => new Intl.NumberFormat(locale).format(value);

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
          purchasesCount: numbers.purchases, purchases: new Intl.NumberFormat(locale).format(numbers.purchases), sum: money(numbers.sum), cap: money(numbers.cap), cpvGroup: numbers.cpvGroup,
          from: formatDate(numbers.from, locale, "long"), to: formatDate(numbers.to, locale, "long"),
        },
      };
    case "FrameworkOverrunNumbers":
      return { rule: "FRAMEWORK_OVERRUN", texts: { ceiling: money(numbers.ceiling), subsequent: money(numbers.subsequent), ratio: ratioPercent(numbers.ratio, locale) } };
    case "NoPublicationNumbers":
      return { rule: "NO_PUBLICATION", texts: { procedure: numbers.procedure } };
    case "YoungFirmNumbers":
      return { rule: "YOUNG_FIRM", texts: { days: count(numbers.days, locale), daysCount: numbers.days, registered: formatDate(numbers.registered, locale, "long") } };
    case "NoConstructionCaenNumbers":
      return { rule: "NO_CONSTRUCTION_CAEN", texts: { value: money(numbers.value), codes: count(numbers.authorisedCodes, locale), codesCount: numbers.authorisedCodes } };
    case "AfterStrikeOffNumbers":
      return { rule: "AFTER_STRIKE_OFF", texts: { struckOff: formatDate(numbers.struckOff, locale, "long"), daysAfter: count(numbers.daysAfter, locale), daysAfterCount: numbers.daysAfter } };
    case "InsolvencyNumbers":
      return { rule: "INSOLVENCY", texts: { status: numbers.status, firstSeen: formatDate(numbers.firstSeen, locale, "long"), sinceAtLeast: numbers.sinceAtLeast } };
    case "FewEmployeesNumbers":
      return { rule: "FEW_EMPLOYEES", texts: { fiscalYear: String(numbers.fiscalYear), employees: count(numbers.employees, locale), employeesCount: numbers.employees, awarded: money(numbers.awarded) } };
    case "NoFinancialStatementNumbers":
      return { rule: "NO_FINANCIAL_STATEMENT", texts: { fiscalYear: String(numbers.fiscalYear), previousYear: String(numbers.fiscalYear - 1), awarded: money(numbers.awarded), legalForm: numbers.legalForm } };
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
    case "YOUNG_FIRM":
      return rules.YOUNG_FIRM.sentence(filled.texts);
    case "NO_CONSTRUCTION_CAEN":
      return rules.NO_CONSTRUCTION_CAEN.sentence(filled.texts);
    case "AFTER_STRIKE_OFF":
      return rules.AFTER_STRIKE_OFF.sentence(filled.texts);
    case "INSOLVENCY":
      return rules.INSOLVENCY.sentence(filled.texts);
    case "FEW_EMPLOYEES":
      return rules.FEW_EMPLOYEES.sentence(filled.texts);
    case "NO_FINANCIAL_STATEMENT":
      return rules.NO_FINANCIAL_STATEMENT.sentence(filled.texts);
  }
}

// ---- the neutral-wording guard -------------------------------------------------------------------------------------------------------

/** Stems of the words a Signal's copy never uses (stripped of diacritics, lower case): a Signal states a pattern, it does not accuse. */
export const FORBIDDEN_STEMS: Record<Locale, RegExp> = {
  en: /suspect|suspicio|fraud|irregular|illegal|unlawful|risk/,
  ro: /suspect|suspici|fraud|nereg|ilegal|nelegal|risc/,
};

const stripDiacritics = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The forbidden stems found in a text (empty when it is neutral). Both languages' stems are looked for in every text (an English word left in Romanian copy is caught too); the given language's own stems come first. */
export function forbiddenWords(text: string, locale: Locale): string[] {
  const plain = stripDiacritics(text);
  const other: Locale = locale === "en" ? "ro" : "en";
  const found = new RegExp(`${FORBIDDEN_STEMS[locale].source}|${FORBIDDEN_STEMS[other].source}`, "g");
  return [...plain.matchAll(found)].map((m) => m[0]);
}

/** Every wording of the rules (label, sentence filled with the given numbers, lawful line) as plain strings: what the guard reads. */
export function ruleTexts(rules: SignalRulesCopy, numbers: SignalNumberTexts): string[] {
  const of = <R extends SignalRule>(rule: R) => {
    const copy: SignalRuleCopy<R> = rules[rule];
    return [copy.label, copy.sentence(numbers[rule]), copy.lawful];
  };
  return SIGNAL_RULES.flatMap((rule) => of(rule));
}
