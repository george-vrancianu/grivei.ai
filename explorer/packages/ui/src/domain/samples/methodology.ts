// Sample copy and data for the methodology page's stories and tests, in both languages. The page's real prose is the app's catalogue (`methodologyEn.ts`,
// `methodologyRo.ts`); these are short stand-ins of the same shape, so a story shows the layout and every state without that much text.
import { fixtures } from "@grivei/contract/fixtures";
import type { Locale } from "../../theme/index.ts";
import { withAmounts, type MethodologyPageCopy, type MethodologyRuleCopy } from "../organisms/MethodologyPage/index.ts";
import type { SignalRuleBaseRateCopy } from "../molecules/SignalRuleBaseRate/index.ts";
import type { SignalRuleBaseRateData } from "../types.ts";

const baseRate: Record<Locale, SignalRuleBaseRateCopy> = {
  en: {
    windowLabel: "Time window", range: (from, to) => `${from} to ${to}`, openStart: (to) => `From the first Record loaded to ${to}`,
    rateLabel: "How often it fires nationally", rate: (percent, year) => `${percent} of contracting authorities had at least one in ${year}.`,
    none: (year) => `No contracting authority had one in ${year}.`, dataThrough: (date) => `Data through ${date}`,
    loading: "Loading the window and the national figure…", error: "The window and the national figure could not be loaded. The rule above still applies.",
    missing: "There is no national figure for this rule yet.",
  },
  ro: {
    windowLabel: "Fereastra de timp", range: (from, to) => `${from} – ${to}`, openStart: (to) => `De la prima înregistrare încărcată până la ${to}`,
    rateLabel: "Cât de des apare la nivel național", rate: (percent, year) => `${percent} dintre autoritățile contractante au avut cel puțin unul în ${year}.`,
    none: (year) => `Nicio autoritate contractantă nu a avut vreunul în ${year}.`, dataThrough: (date) => `Date până la ${date}`,
    loading: "Se încarcă fereastra și cifra națională…", error: "Fereastra și cifra națională nu au putut fi încărcate. Regula de mai sus rămâne valabilă.",
    missing: "Nu există încă o cifră națională pentru această regulă.",
  },
};

const sections = {
  en: {
    awardedValue: "Awarded value", frameworkCeilings: "Framework ceilings", consortiumShares: "Consortium shares", suspectValues: "Suspect values", blankValues: "Blank values",
    contractModifications: "Contract modifications", backfilledValues: "Values of backfilled 2021–22 Records", supplierIdentity: "Supplier identity", placement: "Placement",
    coverageStatuses: "Coverage statuses", publicEnterprises: "Public enterprises (AMEPIP)", partyAndLeadership: "Party and leadership (AEP)", financialStatements: "Financial statements (MF)",
  },
  ro: {
    awardedValue: "Valoarea atribuită", frameworkCeilings: "Plafoane de acord-cadru", consortiumShares: "Părți din asociere", suspectValues: "Valori suspecte", blankValues: "Valori lipsă",
    contractModifications: "Modificările contractelor", backfilledValues: "Valorile înregistrărilor 2021–22 completate ulterior", supplierIdentity: "Identitatea furnizorului",
    placement: "Amplasarea", coverageStatuses: "Stări de acoperire", publicEnterprises: "Întreprinderi publice (AMEPIP)", partyAndLeadership: "Partid și conducere (AEP)", financialStatements: "Situații financiare (MF)",
  },
} as const;
const rules = {
  en: { OVER_CAP: "Over cap", SPLITTING: "Splitting", FRAMEWORK_OVERRUN: "Framework overrun", NO_PUBLICATION: "No publication" },
  ro: { OVER_CAP: "Peste plafon", SPLITTING: "Fracționare", FRAMEWORK_OVERRUN: "Depășirea acordului-cadru", NO_PUBLICATION: "Fără publicare" },
} as const;

/** Short stand-in copy: one sentence per section and one rule line per Signal rule. */
export function sampleMethodologyCopy(locale: Locale): MethodologyPageCopy {
  const en = locale === "en";
  const section = (heading: string) => ({ heading, paragraphs: [en ? `How ${heading.toLowerCase()} is counted, in one sentence.` : `Cum se tratează „${heading.toLowerCase()}”, într-o propoziție.`] });
  const rule = (heading: string): MethodologyRuleCopy => ({
    heading, paragraphs: [en ? `${heading}: the rule in one sentence.` : `${heading}: regula într-o propoziție.`],
    items: [en ? "One condition of the rule." : "O condiție a regulii.", withAmounts((cap) => (en ? `At most ${cap} for goods and services.` : `Cel mult ${cap} pentru bunuri și servicii.`), ["13506000"])],
    lawful: en ? "Possible lawful explanations: a sample line." : "Explicații legale posibile: o linie de probă.",
  });
  const s = sections[locale];
  return {
    eyebrow: en ? "about the numbers" : "despre cifre",
    title: en ? "About the numbers" : "Despre cifre",
    intro: en ? "How every number in the explorer is counted." : "Cum se calculează fiecare cifră din explorator.",
    contents: en ? "On this page" : "Pe această pagină",
    sections: {
      awardedValue: section(s.awardedValue), frameworkCeilings: section(s.frameworkCeilings), consortiumShares: section(s.consortiumShares), suspectValues: section(s.suspectValues),
      blankValues: section(s.blankValues), contractModifications: section(s.contractModifications), backfilledValues: section(s.backfilledValues),
      supplierIdentity: section(s.supplierIdentity), placement: section(s.placement), coverageStatuses: section(s.coverageStatuses), publicEnterprises: section(s.publicEnterprises), partyAndLeadership: section(s.partyAndLeadership), financialStatements: section(s.financialStatements),
    },
    signals: { heading: en ? "Signal rules" : "Regulile Semnalelor", paragraphs: [en ? "A Signal is a set of Records matched by a published rule." : "Un Semnal este un set de înregistrări potrivite de o regulă publicată."] },
    rules: {
      OVER_CAP: rule(rules[locale].OVER_CAP), SPLITTING: rule(rules[locale].SPLITTING), FRAMEWORK_OVERRUN: rule(rules[locale].FRAMEWORK_OVERRUN), NO_PUBLICATION: rule(rules[locale].NO_PUBLICATION),
    },
    baseRate: baseRate[locale],
    referenceDataThrough: (date) => (locale === "ro" ? `Date până la ${date}` : `Data through ${date}`),
    referenceFiscalYearThrough: (year) => (locale === "ro" ? `Date până la anul fiscal ${year}` : `Data through fiscal year ${year}`),
  };
}

export const sampleBaseRateCopy = (locale: Locale): SignalRuleBaseRateCopy => baseRate[locale];

/** The `MethodologyBaseRates` fixture of a given name (`typical-after-backfill`, `before-backfill`). */
export function methodologyRates(name: "typical-after-backfill" | "before-backfill"): SignalRuleBaseRateData[] {
  const found = fixtures.MethodologyBaseRates.find((f) => f.name === name);
  if (!found) throw new Error(`no MethodologyBaseRates fixture ${name}`);
  return found.data.signalRules;
}
