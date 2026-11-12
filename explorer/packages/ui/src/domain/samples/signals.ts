// Sample Signals for stories and tests: one per rule, plus a many-suppliers edge. Invented entities and numbers (the shapes follow
// `SignalFields`); the recorded Overview fixtures carry real-shaped over-cap and no-publication Signals too, but the other two rules
// have no recorded fixture yet (#76 adds the framework-overrun rule to the pipeline).
import type { EntityRef, SignalData, SignalRule } from "../types.ts";
import type { SignalNumberTexts } from "../utils/signalWording.ts";

const authority: EntityRef = { key: "4000001", displayName: "MUNICIPIUL BRAȘOV", identity: "CUI" };
const roadAuthority: EntityRef = { key: "4000002", displayName: "COMPANIA NAȚIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.", identity: "CUI" };
const hospital: EntityRef = { key: "4000003", displayName: "SPITALUL CLINIC JUDEȚEAN DE URGENȚĂ SIBIU", identity: "CUI" };
const hachi: EntityRef = { key: "30000001", displayName: "HACHI INVEST S.R.L.", identity: "CUI" };
const roadBuilder: EntityRef = { key: "30000003", displayName: "DRUMARII ASOCIAȚI S.R.L.", identity: "CUI" };
const foreignFirm: EntityRef = { key: "vat-DE811128135", displayName: "KLEIN BAUSERVICE GMBH", identity: "CUI" };
const nameOnly: EntityRef = { key: "name-furnizor-local-srl", displayName: "FURNIZOR LOCAL S.R.L.", identity: "NAME_ONLY" };

export const overCapSignal: SignalData = {
  rule: "OVER_CAP", date: "2024-01-19", firstDate: "2024-01-19", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [hachi],
  numbers: { __typename: "OverCapNumbers", value: "30000000", cap: "27012000", multiple: 1.11 },
  reproduce: { authority: "4000001", supplier: null, signal: "OVER_CAP", cpv: null, from: "2024-01-19", to: "2024-01-19" },
};

export const splittingSignal: SignalData = {
  rule: "SPLITTING", date: "2024-07-19", firstDate: "2024-07-01", recordCount: 2, dataThrough: "2024-11-30", authority, suppliers: [hachi],
  numbers: { __typename: "SplittingNumbers", purchases: 2, sum: "29000000", cap: "27012000", cpvGroup: "770", from: "2024-07-01", to: "2024-07-19" },
  reproduce: { authority: "4000001", supplier: "30000001", signal: "SPLITTING", cpv: "770", from: "2024-07-01", to: "2024-07-19" },
};

export const frameworkOverrunSignal: SignalData = {
  rule: "FRAMEWORK_OVERRUN", date: "2024-03-12", firstDate: "2022-06-30", recordCount: 13, dataThrough: "2024-11-30", authority: roadAuthority, suppliers: [roadBuilder],
  numbers: { __typename: "FrameworkOverrunNumbers", ceiling: "10000000000", subsequent: "11240000000", ratio: 1.124 },
  reproduce: { authority: "4000002", supplier: "30000003", signal: "FRAMEWORK_OVERRUN", cpv: null, from: null, to: null },
};

export const noPublicationSignal: SignalData = {
  rule: "NO_PUBLICATION", date: "2023-12-01", firstDate: "2023-12-01", recordCount: 1, dataThrough: "2024-11-30", authority: hospital, suppliers: [foreignFirm],
  numbers: { __typename: "NoPublicationNumbers", procedure: "Negociere fără publicare prealabilă" },
  reproduce: { authority: "4000003", supplier: null, signal: "NO_PUBLICATION", cpv: null, from: "2023-12-01", to: "2023-12-01" },
};

/** A Signal with eleven suppliers (one name-only, one foreign) and a long procedure name: the card names five and counts the rest. */
export const manySuppliersSignal: SignalData = {
  rule: "NO_PUBLICATION", date: "2023-12-14", firstDate: "2023-12-14", recordCount: 11, dataThrough: "2024-11-30", authority: roadAuthority,
  suppliers: [
    nameOnly, foreignFirm, hachi, roadBuilder,
    ...Array.from({ length: 7 }, (_, i): EntityRef => ({ key: `${30000100 + i}`, displayName: `FURNIZOR DE SERVICII DE ÎNTREȚINERE ȘI REPARAȚII NR. ${i + 1} S.R.L.`, identity: "CUI" })),
  ],
  numbers: { __typename: "NoPublicationNumbers", procedure: "Negociere fără publicare prealabilă a unui anunț de participare, în situații de extremă urgență" },
  reproduce: { authority: "4000002", supplier: null, signal: "NO_PUBLICATION", cpv: null, from: "2023-12-14", to: "2023-12-14" },
};

/** The URL slug of a rule, as the app writes it (`over-cap`, `framework-overrun`): for the stories' links. */
export const ruleSlug = (rule: SignalRule): string => rule.toLowerCase().replaceAll("_", "-");

export const signalSamples: Record<SignalRule, SignalData> = {
  OVER_CAP: overCapSignal, SPLITTING: splittingSignal, FRAMEWORK_OVERRUN: frameworkOverrunSignal, NO_PUBLICATION: noPublicationSignal,
};

/** Sample numbers every rule's sentence is rendered with in the guard tests (English formats; the sentences only place them). */
export const sampleNumberTexts: SignalNumberTexts = {
  OVER_CAP: { value: "RON 300,000.00", cap: "RON 270,120.00", multiple: "1.11" },
  SPLITTING: { purchasesCount: 25, purchases: "25", sum: "RON 290,000.00", cap: "RON 270,120.00", cpvGroup: "770", from: "1 July 2024", to: "19 July 2024" },
  FRAMEWORK_OVERRUN: { ceiling: "RON 100,000,000.00", subsequent: "RON 112,400,000.00", ratio: "112.4%" },
  NO_PUBLICATION: { procedure: "Negociere fără publicare prealabilă" },
};
