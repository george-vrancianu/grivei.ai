/**
 * The cases whose answers are recorded as the contract's Signal fixtures (ticket #89): each is one persisted-query request, asked of the
 * API after a real rebuild (seam 1). The block "recorded fixtures (#89)" in `seam1.test.ts` compares each answer with the committed JSON
 * and, with `RECORD_FIXTURES=1`, rewrites it. Same convention as `recordedEntityCases.ts` (#86).
 *
 * Four archives, one per rule family (the fourth, `onrcSignals`, is the six ONRC and financial-statement rules of #184): `signals` (over-cap and no-publication), `splitting` and `frameworkOverrun` (each also has a few
 * of the others' Signals or none). The entity pages of the three share keys (the hospital 1000017, ALFA 2000007 ...), so a case in a
 * later archive asks with the Signal filter (`?signal=splitting`), which is also how a reader narrows an Overview to one rule.
 * The Records-tab answers for each Signal's own reproducing filter are not listed here: the block derives them from the Overview answers
 * (one case per Signal shown), so a Signal and its Records list can never drift apart.
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export type SignalArchive = "signals" | "splitting" | "frameworkOverrun" | "onrcSignals";

export interface RecordedSignalCase {
  operation: "EntityOverview" | "EntityRecords" | "EntityRelationships" | "MainScreen" | "FullResultsAuthorities" | "FullResultsSuppliers" | "FullResultsRecords" | "RecordPage" | "MethodologyBaseRates";
  /** Unique within its operation. */
  name: string;
  archive: SignalArchive;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

/** The entities of the three Signal archives (build_signals_archive.py, build_splitting_archive.py, build_framework_overrun_archive.py), all invented. */
export const SIGNAL_KEYS = {
  hospital: "1000017", commune: "1000009", cnair: "2000031", alfa: "2000007", beta: "2000015", gamma: "2000023",
  // archive-onrc-signals (build_onrc_signals_archive.py): its two authorities and two suppliers (a sum over two authorities; an insolvency first seen in a snapshot)
  onrcA1: "3200011", onrcA2: "3200020", feSummed: "3201297", inFirstApr: "3201203",
} as const;

const overview = (key: string, role: "AUTHORITY" | "SUPPLIER", extra: Record<string, unknown> = {}) => ({ key, role, filter: {}, ...extra });
const entity = (name: string, archive: SignalArchive, description: string, key: string, role: "AUTHORITY" | "SUPPLIER", extra: Record<string, unknown> = {}): RecordedSignalCase =>
  ({ operation: "EntityOverview", name, archive, kind: "typical", description, variables: overview(key, role, extra) });
const list = (operation: RecordedSignalCase["operation"], name: string, description: string, variables: Record<string, unknown>, kind: FixtureKind = "typical"): RecordedSignalCase =>
  ({ operation, name, archive: "signals", kind, description, variables });
const record = (name: string, archive: SignalArchive, description: string, code: string): RecordedSignalCase =>
  ({ operation: "RecordPage", name, archive, kind: "typical", description, variables: { code } });
const PAGE = { limit: 50, offset: 0 };

export const RECORDED_SIGNAL_CASES: readonly RecordedSignalCase[] = [
  // ---- the Overview's Signals (archive-signals: over-cap and no-publication; the hospital, ALFA and the by-value order are #86's) ----
  entity("commune-with-signals", "signals", "an authority with one no-publication and two over-cap Signals, one supplier each (?signalOrder=date-desc)", SIGNAL_KEYS.commune, "AUTHORITY", { signalOrder: "DATE_DESC" }),
  entity("consortium-member-supplier", "signals", "a supplier that won one Record of a consortium's no-publication Signal: the Signal is on its page too, with all three suppliers named", SIGNAL_KEYS.gamma, "SUPPLIER", { signalOrder: "DATE_DESC" }),
  entity("supplier-in-three-authorities-signals", "signals", "a supplier whose Records are in Signals of three authorities (one of them a both-roles entity acting as authority)", SIGNAL_KEYS.beta, "SUPPLIER", { signalOrder: "DATE_DESC" }),
  entity("both-roles-authority-with-signal", "signals", "an entity that is both authority and supplier: its authority page lists the over-cap Signal of its own purchase", SIGNAL_KEYS.cnair, "AUTHORITY", { signalOrder: "DATE_DESC" }),
  // ---- the Relationships tab's rings: counterparties whose shared Records are in a Signal (the year chip keeps the variables apart from the roles archive's pages) ----
  { operation: "EntityRelationships", name: "authority-counterparties-with-signals", archive: "signals", kind: "typical", description: "an authority's graph in 2023: the suppliers of its Records inside Signals carry a ring (hasSignals), the others none", variables: { key: SIGNAL_KEYS.hospital, role: "AUTHORITY", filter: { from: "2023-01-01", to: "2023-12-31" } } },
  { operation: "EntityRelationships", name: "supplier-counterparties-with-signals", archive: "signals", kind: "typical", description: "a supplier's graph in 2023: the authorities whose Signals touch its Records carry a ring", variables: { key: SIGNAL_KEYS.beta, role: "SUPPLIER", filter: { from: "2023-01-01", to: "2023-12-31" } } },
  // ---- archive-splitting (asked with the Signal filter, as `?signal=splitting`: the same keys are in the other archives) ----
  entity("splitting-authority", "splitting", "an authority's splitting Signals (?signal=splitting): purchases, CPV group and window in the numbers, three Records in the longest", SIGNAL_KEYS.hospital, "AUTHORITY", { filter: { signal: "SPLITTING" } }),
  entity("splitting-supplier", "splitting", "a supplier's splitting Signals (?signal=splitting): two Signals of one authority", SIGNAL_KEYS.gamma, "SUPPLIER", { filter: { signal: "SPLITTING" } }),
  entity("splitting-supplier-three-authorities", "splitting", "a supplier with a splitting Signal in each of three authorities", SIGNAL_KEYS.alfa, "SUPPLIER", { filter: { signal: "SPLITTING" } }),
  { operation: "EntityRecords", name: "supplier-with-splitting-facet", archive: "splitting", kind: "typical", description: "a supplier's Records tab after the Splitting facet (?signal=splitting): the Records of its two splitting Signals", variables: { key: SIGNAL_KEYS.gamma, role: "SUPPLIER", filter: { signal: "SPLITTING" }, limit: 100, offset: 0 } },
  // ---- archive-framework-overrun (?signal=framework-overrun) ----
  entity("framework-overrun-authority", "frameworkOverrun", "an authority's framework-overrun Signals: the ceiling, the subsequent total reported and its ratio", SIGNAL_KEYS.hospital, "AUTHORITY", { filter: { signal: "FRAMEWORK_OVERRUN" } }),
  entity("framework-overrun-consortium-authority", "frameworkOverrun", "an authority whose overrun framework was won by a consortium of three: one Signal naming all three suppliers", SIGNAL_KEYS.cnair, "AUTHORITY", { filter: { signal: "FRAMEWORK_OVERRUN" } }),
  entity("framework-overrun-consortium-member", "frameworkOverrun", "a supplier that is a member of two authorities' overrun frameworks", SIGNAL_KEYS.gamma, "SUPPLIER", { filter: { signal: "FRAMEWORK_OVERRUN" } }),
  entity("framework-overrun-supplier", "frameworkOverrun", "a supplier with a framework-overrun Signal in each of two authorities", SIGNAL_KEYS.beta, "SUPPLIER", { filter: { signal: "FRAMEWORK_OVERRUN" } }),
  // ---- archive-onrc-signals (#184): each of the six rules on an authority's page (asked with the rule's filter, `?signal=young-firm`), and two supplier pages ----
  entity("young-firm-authority", "onrcSignals", "an authority's young-firm Signals: days from registering, the registration date and the Record's counted value", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "YOUNG_FIRM" } }),
  entity("no-construction-caen-authority", "onrcSignals", "an authority's works Signals for firms with no construction CAEN: the value and the number of authorised codes", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "NO_CONSTRUCTION_CAEN" } }),
  entity("after-strike-off-authority", "onrcSignals", "an authority's Records dated after the supplier's ANAF strike-off: the strike-off date and the days after it", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "AFTER_STRIKE_OFF" } }),
  entity("insolvency-authority", "onrcSignals", "an authority's Records of suppliers now in insolvency or reorganisation: the status as ONRC names it, undated, first seen in a snapshot (one only since the earliest snapshot held)", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "INSOLVENCY" } }),
  entity("few-employees-authority", "onrcSignals", "an authority's Signals for suppliers reporting at most one average employee: the fiscal year, the count and the year's awards", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "FEW_EMPLOYEES" } }),
  entity("no-financial-statement-authority", "onrcSignals", "an authority's Signals for an SRL or SA with no statement for the year or the year before: the year, the awards and the legal form", SIGNAL_KEYS.onrcA1, "AUTHORITY", { filter: { signal: "NO_FINANCIAL_STATEMENT" } }),
  entity("insolvency-reorganisation-authority", "onrcSignals", "a second authority's insolvency Signal, for a supplier in judicial reorganisation (told by the status name)", SIGNAL_KEYS.onrcA2, "AUTHORITY", { filter: { signal: "INSOLVENCY" } }),
  entity("few-employees-supplier", "onrcSignals", "a supplier whose awards of 5M RON in one year, over two authorities, make two Signals (the sum is the supplier's, not the authority's)", SIGNAL_KEYS.feSummed, "SUPPLIER", { filter: { signal: "FEW_EMPLOYEES" } }),
  entity("insolvency-supplier", "onrcSignals", "a supplier in insolvency: its Signals on its own page, one per authority and day inside the six-month window", SIGNAL_KEYS.inFirstApr, "SUPPLIER", { filter: { signal: "INSOLVENCY" } }),
  // ---- the Record page's Signals (a code is asked in one archive only; #85 has the over-cap, splitting, no-publication and natural-person ones) ----
  record("over-cap-single-record-signal", "signals", "a Record that is the only one of its over-cap Signal: the card's Check-in-SEAP link points at this Record", "DA98000009"),
  record("framework-overrun-ceiling", "frameworkOverrun", "the ceiling Record of a framework whose subsequent contracts add up to 125%: the framework-overrun Signal with its four Records (the ceiling and the first three subsequent contracts)", "CAN9700001~1"),
  record("framework-overrun-subsequent-after-crossing", "frameworkOverrun", "the subsequent contract reported after the crossing: in the framework's total and ratio, not a Record of the Signal, so it lists none", "CAN9700001~5"),
  record("framework-overrun-consortium", "frameworkOverrun", "a framework ceiling won by a consortium of three, in an overrun Signal that names all three suppliers", "CAN9700006~1"),
  record("framework-overrun-single-record", "frameworkOverrun", "a Signal of one Record (a ceiling and nothing else is a member): Check in SEAP links this Record", "CAN9700009~1"),
  // ---- the has-Signals chip, end to end (archive-signals) ----
  list("MainScreen", "has-signals-chip", "the has-Signals chip on: the totals, the tabs and the Records are those of Records inside a Signal", { filter: { hasSignals: true } }),
  list("MainScreen", "without-signals-chip", "the chip set to without Signals: the Records outside every Signal", { filter: { hasSignals: false } }),
  list("FullResultsAuthorities", "has-signals-chip", "the authorities tab, full view, with the chip on", { filter: { hasSignals: true }, ...PAGE }),
  list("FullResultsSuppliers", "has-signals-chip", "the suppliers tab, full view, with the chip on", { filter: { hasSignals: true }, ...PAGE }),
  list("FullResultsRecords", "has-signals-chip", "the Records tab, full view, with the chip on (default order)", { filter: { hasSignals: true }, ...PAGE }),
  // ---- the methodology page's base rates: each archive's own answer to `signalRules` ----
  list("MethodologyBaseRates", "signals-archive", "over-cap and no-publication fire for authorities (2 of 3 and 1 of 3), splitting and framework-overrun for none", {}),
  { operation: "MethodologyBaseRates", name: "splitting-archive", archive: "splitting", kind: "typical", description: "splitting fires for 2 of 3 authorities with a direct purchase in 2023", variables: {} },
  { operation: "MethodologyBaseRates", name: "onrc-signals-archive", archive: "onrcSignals", kind: "typical", description: "the six ONRC and financial-statement rules beside the four SEAP ones: firing rates recomputed in this load (the statements' rules measure in the newest year they can see)", variables: {} },
  { operation: "MethodologyBaseRates", name: "framework-overrun-archive", archive: "frameworkOverrun", kind: "typical", description: "framework-overrun fires for 3 authorities; its window starts at the rule's 2021 floor (a 2020 Contracte file is loaded)", variables: {} },
];
