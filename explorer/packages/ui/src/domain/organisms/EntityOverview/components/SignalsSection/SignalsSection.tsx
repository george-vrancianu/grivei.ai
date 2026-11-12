import type { ReactNode } from "react";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";

export interface SignalsSectionCopy {
  /** "Signals (2)", given the count and its formatted text. */
  heading: (count: number, formatted: string) => string;
  /** The sentence when the entity has no Signals. */
  empty: string;
}

export interface SignalsSectionProps {
  /** `overview.signals.count`: all Signals of the filter, not only the rows sent. */
  count: number;
  locale: Locale;
  copy: SignalsSectionCopy;
  /** The Signal cards (the Signal card organism fills this slot). */
  children?: ReactNode;
}

/** The Signals section: a heading with the count, the slot for the Signal cards, and a sentence when there are none. */
export function SignalsSection({ count, locale, copy, children }: SignalsSectionProps) {
  const heading = copy.heading(count, formatCount(count, false, locale));
  return (
    <Stack component="section" spacing={1} aria-label={heading}>
      <Typography variant="h6" component="h2">
        {heading}
      </Typography>
      {count === 0 ? <Typography color="text.secondary">{copy.empty}</Typography> : children}
    </Stack>
  );
}
