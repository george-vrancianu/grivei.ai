import { Chip } from "../../../atoms/Chip/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color } from "../../../theme/tokens.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { SignalMark } from "../../atoms/SignalMark/index.ts";

export interface SignalCountChipCopy {
  /** "3 Signals" with the language's plural rule; `formatted` is the count in the locale's number format. */
  label: (n: number, formatted: string) => string;
}

export interface SignalCountChipProps {
  /** How many Signals the entity has. The caller shows the chip only for a count above zero. */
  count: number;
  /** Where it leads: the entity's Overview at its Signals section. */
  href: string;
  locale: Locale;
  copy: SignalCountChipCopy;
}

/** "n Signals": a link chip in the Signal style (amber ring, outlined, never red, no score) that opens the entity's Overview at its Signals section. */
export function SignalCountChip({ count, href, locale, copy }: SignalCountChipProps) {
  return (
    <Chip
      component="a"
      href={href}
      clickable
      size="small"
      variant="outlined"
      icon={<SignalMark size="small" />}
      sx={{ borderColor: color.signalLine, color: color.accent, "&.MuiChip-root .MuiChip-icon": { color: "inherit", ml: "8px", mr: "-4px" } }}
      label={copy.label(count, formatCount(count, false, locale))}
    />
  );
}
