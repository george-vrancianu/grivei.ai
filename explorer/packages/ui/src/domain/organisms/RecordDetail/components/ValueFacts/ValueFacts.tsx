import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { color, type } from "../../../../../theme/tokens.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { fitSize } from "../../../../utils/fitSize.ts";
import { notCountedReason, type NotCountedReason } from "../../recordDetail.utils.ts";

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
  copy: ValueFactsCopy & {
    /** The caption of a framework ceiling's value: "ceiling, not summed". */
    ceilingCaption: string;
  };
  /** More inside the card, under the values (the framework line with its bar). */
  children?: ReactNode;
}

/**
 * The value card: the value as published in the big number (a framework ceiling says "ceiling, not summed"), the counted value under it
 * (an empty one says why), and whatever the Record adds below. The published value is never edited.
 */
export function ValueFacts({ record, locale, copy, children }: ValueFactsProps) {
  const reason = notCountedReason(record);
  return (
    <Card component="div" sx={{ p: 2.5, containerType: "inline-size" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box component="dl" sx={{ m: 0, display: "grid", rowGap: 0.5 }}>
          <Typography variant="meta" component="dt">
            {copy.published}
          </Typography>
          <Box component="dd" sx={{ m: 0, mb: 1.5 }}>
            <Typography variant="stat" component="p" sx={{ fontSize: fitSize(type.stat.size), overflowWrap: "anywhere" }}>
              {record.value === null ? (
                <Typography variant="h4" component="span">
                  {copy.noValue}
                </Typography>
              ) : (
                <MoneyAmount bani={record.value} locale={locale} showBani />
              )}
            </Typography>
            {reason === "frameworkCeiling" && (
              <Typography variant="meta" component="p" sx={{ mt: 0.5, color: color.text2 }}>
                {copy.ceilingCaption}
              </Typography>
            )}
          </Box>
          <Typography variant="meta" component="dt">
            {copy.counted}
          </Typography>
          <Box component="dd" sx={{ m: 0 }}>
            {record.counted !== null ? <MoneyAmount bani={record.counted} locale={locale} showBani /> : copy.notCounted[reason ?? "other"]}
          </Box>
        </Box>
        {children}
      </Box>
    </Card>
  );
}
