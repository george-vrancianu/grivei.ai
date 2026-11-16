import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { color, type } from "../../../../../theme/tokens.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { fitSize } from "../../../../utils/fitSize.ts";
import { notCountedReason, type NotCountedReason } from "../../recordDetail.utils.ts";

export interface ValueFactsCopy {
  /** The panel's title ("Value"). */
  heading: string;
  /** "Value as published": what SEAP says. */
  published: string;
  /** "Counted value": what this Record adds to totals. */
  counted: string;
  /** SEAP publishes no value for this Record. */
  noValue: string;
  /** Why the counted value is empty: the note of the counted figure. */
  notCounted: Record<NotCountedReason, string>;
}

export interface ValueFactsProps {
  record: RecordPageData;
  locale: Locale;
  copy: ValueFactsCopy & {
    /** The caption of a framework ceiling's value: "ceiling, not summed". */
    ceilingCaption: string;
  };
  /** More inside the panel, under the values (the framework line with its bar). */
  children?: ReactNode;
  /** The header strip's right slot: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** The panel shows a held answer while the next loads. */
  busy?: boolean | undefined;
}

/**
 * The value panel: the value as published in the big number with its caption (a framework ceiling says "ceiling, not summed"), the counted value beside it as an inset figure
 * (an empty one says why in its note), and whatever the Record adds below (the framework line with its bar). The published value is never edited.
 */
export function ValueFacts({ record, locale, copy, children, status, busy }: ValueFactsProps) {
  const reason = notCountedReason(record);
  return (
    <Panel heading={copy.heading} level="h2" aside={status} busy={busy}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "16px 20px" }}>
        <Box component="dl" sx={{ m: 0, flex: "2 1 280px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", rowGap: 0.5 }}>
          <Typography variant="meta" component="dt">
            {copy.published}
          </Typography>
          <Box component="dd" sx={{ m: 0 }}>
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
        </Box>
        <InsetFigure label={copy.counted} note={record.counted === null ? copy.notCounted[reason ?? "other"] : undefined}>
          {record.counted !== null ? <MoneyAmount bani={record.counted} locale={locale} showBani /> : "–"}
        </InsetFigure>
      </Box>
      {children}
    </Panel>
  );
}
