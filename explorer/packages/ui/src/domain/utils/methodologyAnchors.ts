import type { SignalRule } from "../types.ts";

/**
 * The ids of the sections of the methodology page ("About the numbers" / "Despre cifre"): the same in both languages, English slugs.
 * Every link that explains a number lands on one of these (`/explore/methodology#awarded-value`), so renaming one breaks links already shared.
 */
export const METHODOLOGY_ANCHORS = {
  awardedValue: "awarded-value",
  frameworkCeilings: "framework-ceilings",
  consortiumShares: "consortium-shares",
  suspectValues: "suspect-values",
  blankValues: "blank-values",
  contractModifications: "contract-modifications",
  backfilledValues: "backfilled-values",
  supplierIdentity: "supplier-identity",
  placement: "placement",
  coverageStatuses: "coverage-statuses",
  publicEnterprises: "public-enterprises",
  partyAndLeadership: "party-and-leadership",
  financialStatements: "financial-statements",
  firmDonations: "firm-donations",
  signals: "signals",
} as const;

export type MethodologySectionKey = keyof typeof METHODOLOGY_ANCHORS;
/** The sections in the order the page shows them (the table of contents follows it). */
export const METHODOLOGY_SECTIONS: readonly Exclude<MethodologySectionKey, "signals">[] = [
  "awardedValue", "frameworkCeilings", "consortiumShares", "suspectValues", "blankValues", "contractModifications", "backfilledValues",
  "supplierIdentity", "placement", "coverageStatuses", "publicEnterprises", "partyAndLeadership", "financialStatements", "firmDonations",
];

/** The anchor of a Signal rule's section: `signal-over-cap`, `signal-framework-overrun` (the rule's slug in lower case with hyphens). */
export const signalAnchor = (rule: SignalRule): string => `signal-${rule.toLowerCase().replaceAll("_", "-")}`;

/** Every anchor of the page, in page order: the general sections, the Signal rules' group and one section per rule. */
export function allMethodologyAnchors(rules: readonly SignalRule[]): string[] {
  return [...METHODOLOGY_SECTIONS.map((k) => METHODOLOGY_ANCHORS[k]), METHODOLOGY_ANCHORS.signals, ...rules.map(signalAnchor)];
}
