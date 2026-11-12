import { Box } from "../../../../../atoms/Box/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { notCountedReason, type NotCountedReason } from "../../recordDetail.utils.ts";
import { factsSx } from "../facts.ts";

export interface ValueFactsCopy {
  /** "Value as published": what SEAP says. */
  published: string;
  /** "Counted value": what this Record adds to totals. */
  counted: string;
  /** SEAP publishes no value for this Record. */
  noValue: string;
  /** Why the counted value is empty. */
  notCounted: Record<NotCountedReason, string>;
}

export interface ValueFactsProps {
  record: RecordPageData;
  locale: Locale;
  copy: ValueFactsCopy;
}

/** The value as published and the counted value, side by side; an empty counted value says why. The published value is never edited. */
export function ValueFacts({ record, locale, copy }: ValueFactsProps) {
  const reason = notCountedReason(record);
  return (
    <Box component="dl" sx={factsSx}>
      <dt>{copy.published}</dt>
      <dd>{record.value === null ? copy.noValue : <MoneyAmount bani={record.value} locale={locale} showBani />}</dd>
      <dt>{copy.counted}</dt>
      <dd>{record.counted !== null ? <MoneyAmount bani={record.counted} locale={locale} showBani /> : copy.notCounted[reason ?? "other"]}</dd>
    </Box>
  );
}
