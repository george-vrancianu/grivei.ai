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
});
