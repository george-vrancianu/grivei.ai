import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { ApproxCount, formatCount } from "../../../../atoms/ApproxCount/index.ts";

export interface ResultsSummaryProps {
  /** The tab's name ("Suppliers"). */
  heading: string;
  count: number;
  /** An estimated distinct count shows "≈". */
  estimated: boolean;
  /** The "showing x–y of N" sentence, or nothing when the page shows no rows. */
  range?: { from: number; to: number; text: (from: string, to: string, total: string) => string } | undefined;
  locale: Locale;
}

/** The tab's name and count, with which results this page shows. */
export function ResultsSummary({ heading, count, estimated, range, locale }: ResultsSummaryProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h3" component="h2">
        {heading} <ApproxCount count={count} estimated={estimated} locale={locale} />
      </Typography>
      {range && (
        <Typography variant="meta" component="p">
          {range.text(formatCount(range.from, false, locale), formatCount(range.to, false, locale), formatCount(count, estimated, locale))}
        </Typography>
      )}
    </Stack>
  );
}
