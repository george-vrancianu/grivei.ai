import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { followLink } from "../../utils/followLink.ts";
import { SignalLinkChip } from "../SignalLinkChip/index.ts";

export interface SignalCountChipCopy {
  /** "3 Signals" with the language's plural rule; `formatted` is the count in the locale's number format. */
  label: (n: number, formatted: string) => string;
  /** The entity's name as a suffix of the chip's `aria-label`, so a list of chips tells which entity each leads to: ", Name". */
  forEntity: (name: string) => string;
}

export interface SignalCountChipProps {
  /** How many Signals the entity has. The caller shows the chip only for a count above zero. */
  count: number;
  /** Where it leads: the entity's Overview at its Signals section. */
  href: string;
  /** The entity the chip belongs to; read by a screen reader after the count (in the `aria-label`), not shown. */
  entityName: string;
  /** A plain click goes here instead of loading the page. */
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: SignalCountChipCopy;
}

/** "n Signals": a link chip in the Signal style (amber ring, outlined, never red, no score) that opens the entity's Overview at its Signals section. */
export function SignalCountChip({ count, href, entityName, onNavigate, locale, copy }: SignalCountChipProps) {
  const text = copy.label(count, formatCount(count, false, locale));
  return (
    <SignalLinkChip
      href={href}
      onClick={followLink(href, onNavigate)}
      label={text}
      aria-label={`${text}${copy.forEntity(entityName)}`}
    />
  );
}
