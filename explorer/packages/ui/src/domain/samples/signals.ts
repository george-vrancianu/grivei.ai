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

const constructii: EntityRef = { key: "30000002", displayName: "CONSTRUCȚII TRANSILVANIA S.A.", identity: "CUI" };

export const youngFirmSignal: SignalData = {
  rule: "YOUNG_FIRM", date: "2024-05-30", firstDate: "2024-05-30", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [constructii],
  numbers: { __typename: "YoungFirmNumbers", days: 90, registered: "2024-03-01", counted: "30000000" },
  reproduce: { authority: "4000001", supplier: null, signal: "YOUNG_FIRM", cpv: null, from: "2024-05-30", to: "2024-05-30" },
};

export const noConstructionCaenSignal: SignalData = {
  rule: "NO_CONSTRUCTION_CAEN", date: "2024-04-10", firstDate: "2024-04-10", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [hachi],
  numbers: { __typename: "NoConstructionCaenNumbers", value: "200000000", authorisedCodes: 3 },
  reproduce: { authority: "4000001", supplier: null, signal: "NO_CONSTRUCTION_CAEN", cpv: null, from: "2024-04-10", to: "2024-04-10" },
};

export const afterStrikeOffSignal: SignalData = {
  rule: "AFTER_STRIKE_OFF", date: "2024-06-01", firstDate: "2024-06-01", recordCount: 1, dataThrough: "2024-11-30", authority: roadAuthority, suppliers: [roadBuilder],
  numbers: { __typename: "AfterStrikeOffNumbers", struckOff: "2022-10-11", daysAfter: 599 },
  reproduce: { authority: "4000002", supplier: null, signal: "AFTER_STRIKE_OFF", cpv: null, from: "2024-06-01", to: "2024-06-01" },
};

export const insolvencySignal: SignalData = {
  rule: "INSOLVENCY", date: "2024-10-15", firstDate: "2024-10-15", recordCount: 1, dataThrough: "2024-11-30", authority: hospital, suppliers: [constructii],
  numbers: { __typename: "InsolvencyNumbers", status: "insolvență", firstSeen: "2024-09-02", sinceAtLeast: false },
  reproduce: { authority: "4000003", supplier: null, signal: "INSOLVENCY", cpv: null, from: "2024-10-15", to: "2024-10-15" },
};

export const fewEmployeesSignal: SignalData = {
  rule: "FEW_EMPLOYEES", date: "2023-09-12", firstDate: "2023-09-12", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [hachi],
  numbers: { __typename: "FewEmployeesNumbers", fiscalYear: 2023, employees: 1, awarded: "540000000" },
  reproduce: { authority: "4000001", supplier: null, signal: "FEW_EMPLOYEES", cpv: null, from: "2023-09-12", to: "2023-09-12" },
};

export const noFinancialStatementSignal: SignalData = {
  rule: "NO_FINANCIAL_STATEMENT", date: "2023-11-08", firstDate: "2023-11-08", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [constructii],
  numbers: { __typename: "NoFinancialStatementNumbers", fiscalYear: 2023, awarded: "1280000000", legalForm: "SA" },
  reproduce: { authority: "4000001", supplier: null, signal: "NO_FINANCIAL_STATEMENT", cpv: null, from: "2023-11-08", to: "2023-11-08" },
};

export const donorToPartySignal: SignalData = {
  rule: "DONOR_TO_PARTY", date: "2023-11-20", firstDate: "2023-11-20", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [constructii],
  numbers: { __typename: "DonorToPartyNumbers", days: 112, party: "PARTIDUL SOCIAL DEMOCRAT", derived: false, kind: "DONATION" },
  reproduce: { authority: "4000001", supplier: null, signal: "DONOR_TO_PARTY", cpv: null, from: "2023-11-20", to: "2023-11-20" },
};

/** Restricted: the card exists only when the API returns the rule. */
export const soeBoardInSupplierSignal: SignalData = {
  rule: "SOE_BOARD_IN_SUPPLIER", date: "2023-11-21", firstDate: "2023-11-21", recordCount: 1, dataThrough: "2024-11-30", authority, suppliers: [constructii],
  numbers: { __typename: "SoeBoardInSupplierNumbers", persons: 1 },
  reproduce: { authority: "4000001", supplier: null, signal: "SOE_BOARD_IN_SUPPLIER", cpv: null, from: "2023-11-21", to: "2023-11-21" },
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
  YOUNG_FIRM: youngFirmSignal, NO_CONSTRUCTION_CAEN: noConstructionCaenSignal, AFTER_STRIKE_OFF: afterStrikeOffSignal, INSOLVENCY: insolvencySignal,
  FEW_EMPLOYEES: fewEmployeesSignal, NO_FINANCIAL_STATEMENT: noFinancialStatementSignal,
  DONOR_TO_PARTY: donorToPartySignal, SOE_BOARD_IN_SUPPLIER: soeBoardInSupplierSignal,
};

/** Sample numbers every rule's sentence is rendered with in the guard tests (English formats; the sentences only place them). */
export const sampleNumberTexts: SignalNumberTexts = {
  OVER_CAP: { value: "RON 300,000.00", cap: "RON 270,120.00", multiple: "1.11" },
  SPLITTING: { purchasesCount: 25, purchases: "25", sum: "RON 290,000.00", cap: "RON 270,120.00", cpvGroup: "770", from: "1 July 2024", to: "19 July 2024" },
  FRAMEWORK_OVERRUN: { ceiling: "RON 100,000,000.00", subsequent: "RON 112,400,000.00", ratio: "112.4%" },
  NO_PUBLICATION: { procedure: "Negociere fără publicare prealabilă" },
  YOUNG_FIRM: { days: "90", daysCount: 90, registered: "1 March 2024" },
  NO_CONSTRUCTION_CAEN: { value: "RON 2,000,000.00", codes: "3", codesCount: 3 },
  AFTER_STRIKE_OFF: { struckOff: "11 October 2022", daysAfter: "599", daysAfterCount: 599 },
  INSOLVENCY: { status: "insolvență", firstSeen: "2 September 2024", sinceAtLeast: false },
  FEW_EMPLOYEES: { fiscalYear: "2023", employees: "1", employeesCount: 1, awarded: "RON 5,400,000.00" },
  NO_FINANCIAL_STATEMENT: { fiscalYear: "2023", previousYear: "2022", awarded: "RON 12,800,000.00", legalForm: "SA" },
  DONOR_TO_PARTY: { days: "112", daysCount: 112, party: "PARTIDUL SOCIAL DEMOCRAT", derived: false, loan: false },
  SOE_BOARD_IN_SUPPLIER: { persons: "1", personsCount: 1 },
};
