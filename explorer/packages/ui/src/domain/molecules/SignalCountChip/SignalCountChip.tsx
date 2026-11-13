import { Box } from "../../../atoms/Box/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { visuallyHidden } from "../../utils/visuallyHidden.ts";
import { SignalChip } from "../SignalChip/index.ts";

export interface SignalCountChipCopy {
  /** "3 Signals" with the language's plural rule; `formatted` is the count in the locale's number format. */
  label: (n: number, formatted: string) => string;
  /** The entity's name as a visually hidden suffix of the chip's accessible name, so a list of chips tells which entity each leads to: ", Name". */
  forEntity: (name: string) => string;
}

export interface SignalCountChipProps {
  /** How many Signals the entity has. The caller shows the chip only for a count above zero. */
  count: number;
  /** Where it leads: the entity's Overview at its Signals section. */
  href: string;
  /** The entity the chip belongs to; read by a screen reader after the count, not shown. */
  entityName: string;
  locale: Locale;
  copy: SignalCountChipCopy;
}

/** "n Signals": a link chip in the Signal style (amber ring, outlined, never red, no score) that opens the entity's Overview at its Signals section. */
export function SignalCountChip({ count, href, entityName, locale, copy }: SignalCountChipProps) {
  return (
    <SignalChip
      href={href}
      label={
        <>
          {copy.label(count, formatCount(count, false, locale))}
          <Box component="span" sx={visuallyHidden}>
            {copy.forEntity(entityName)}
          </Box>
        </>
      }
    />
  );
}
