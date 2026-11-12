import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import type { OverviewFrameworks } from "../../../../types.ts";

export interface FrameworkLineCopy {
  heading: string;
  /** "4 framework agreements, ceilings RON 100,000,000, reported subsequent contracts RON 112,400,000", given the count (for plural rules) and the formatted amounts. */
  line: (count: number, formattedCount: string, ceilings: string, subsequentReported: string) => string;
  /** The sentence when there are none. */
  none: string;
  /** Ceilings are never summed into the total. */
  note: string;
}

export interface FrameworkLineProps {
  frameworks: OverviewFrameworks;
  locale: Locale;
  copy: FrameworkLineCopy;
}

/** The framework line: how many framework agreements, their ceilings and what subsequent contracts reported so far. Ceilings are shown beside the total, never in it. */
export function FrameworkLine({ frameworks, locale, copy }: FrameworkLineProps) {
  return (
    <Stack component="section" spacing={0.5} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      {frameworks.count === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <>
          <Typography>
            {copy.line(frameworks.count, formatCount(frameworks.count, false, locale), formatMoney(frameworks.ceilings, locale), formatMoney(frameworks.subsequentReported, locale))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.note}
          </Typography>
        </>
      )}
    </Stack>
  );
}
