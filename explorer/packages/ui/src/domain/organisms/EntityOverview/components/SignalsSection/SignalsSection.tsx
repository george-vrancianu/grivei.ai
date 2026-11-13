import type { ReactNode } from "react";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { SIGNALS_ANCHOR } from "../../entityOverview.utils.ts";

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
  /** The slot between the heading and the list: the order toggle goes here (#107). Shown only when there are Signals. */
  toolbar?: ReactNode;
  /** The Signal cards (the Signal card organism fills this slot). */
  children?: ReactNode;
}

/** The Signals section, anchored at `#signals`: a heading with the count, a slot for a toolbar, the slot for the Signal cards, and a sentence when there are none. */
export function SignalsSection({ count, locale, copy, toolbar, children }: SignalsSectionProps) {
  const heading = copy.heading(count, formatCount(count, false, locale));
  return (
    <Stack component="section" id={SIGNALS_ANCHOR} spacing={1.5} aria-label={heading} sx={{ scrollMarginTop: 16 }}>
      <SectionHeading>{heading}</SectionHeading>
      {count === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <>
          {toolbar}
          {children}
        </>
      )}
    </Stack>
  );
}
