import type { SignalRuleSlug } from "@grivei/contract";
import type { SignalRulesCopy } from "@grivei/ui";

/**
 * The one name of each Signal rule: its label in the Signal card's wording. The Records tab's facet, the Record page and the compact
 * badge all say the rule this way, so a rule is never called two things on one screen.
 */
export const ruleLabels = (rules: SignalRulesCopy): Record<SignalRuleSlug, string> => ({
  OVER_CAP: rules.OVER_CAP.label,
  SPLITTING: rules.SPLITTING.label,
  FRAMEWORK_OVERRUN: rules.FRAMEWORK_OVERRUN.label,
  NO_PUBLICATION: rules.NO_PUBLICATION.label,
  YOUNG_FIRM: rules.YOUNG_FIRM.label,
  NO_CONSTRUCTION_CAEN: rules.NO_CONSTRUCTION_CAEN.label,
  AFTER_STRIKE_OFF: rules.AFTER_STRIKE_OFF.label,
  INSOLVENCY: rules.INSOLVENCY.label,
  FEW_EMPLOYEES: rules.FEW_EMPLOYEES.label,
  NO_FINANCIAL_STATEMENT: rules.NO_FINANCIAL_STATEMENT.label,
  DONOR_TO_PARTY: rules.DONOR_TO_PARTY.label,
  SOE_BOARD_IN_SUPPLIER: rules.SOE_BOARD_IN_SUPPLIER.label,
});
