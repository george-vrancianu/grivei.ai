import { Chip } from "../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../atoms/Tooltip/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color } from "../../../theme/tokens.ts";
import { SignalMark } from "../../atoms/SignalMark/index.ts";
import type { SignalData } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { signalSentence, type SignalRulesCopy } from "../../utils/signalWording.ts";

export interface SignalBadgeCopy {
  rules: SignalRulesCopy;
  compact: {
    /** The chip's text: the rule's label and the Signal's date, "Over cap, 19 Jan 2024". */
    text: (label: string, when: string) => string;
  };
}

export interface SignalBadgeProps {
  signal: Pick<SignalData, "rule" | "date" | "numbers">;
  /** The Signal's reproducing URL (its Records on the entity's Records tab). */
  href: string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: SignalBadgeCopy;
}

/**
 * The compact form of a Signal, for a Record row or the Record page: a small chip with the rule's label and date that links to the Signal's
 * Records. The one-sentence wording is its tooltip (hover or focus) and its accessible description. Never a score.
 */
export function SignalBadge({ signal, href, onNavigate, locale, copy }: SignalBadgeProps) {
  const label = copy.rules[signal.rule].label;
  return (
    <Tooltip title={signalSentence(signal, locale, copy.rules)} describeChild>
      <Chip
        component="a"
        href={href}
        clickable
        size="small"
        variant="outlined"
        icon={<SignalMark size="small" />}
        sx={{ borderColor: color.signalLine, color: color.accent, "&.MuiChip-root .MuiChip-icon": { color: "inherit", ml: "8px", mr: "-4px" } }}
        label={copy.compact.text(label, formatDate(signal.date, locale))}
        onClick={followLink(href, onNavigate)}
      />
    </Tooltip>
  );
}
