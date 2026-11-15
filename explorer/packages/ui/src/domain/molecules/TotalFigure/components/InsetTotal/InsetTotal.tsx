import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { InsetFigure } from "../../../InsetFigure/index.ts";
import type { Total } from "../../../../types.ts";
import type { InsetTotalCopy } from "../../TotalFigure.tsx";
import { leftOut } from "../../totalFigure.utils.ts";
import { TotalAmount } from "../TotalAmount/index.ts";

export interface InsetTotalProps {
  total: Total;
  locale: Locale;
  copy: InsetTotalCopy;
  methodologyHref: string;
  suspectHref: string;
  /** Shown above the amount, in the amount's column. */
  heading?: ReactNode;
}

/** The inset layout: the amount on the left, each part that is not zero as an inset figure beside it, wrapping under it on a narrow screen. */
export function InsetTotal({ total, locale, copy, methodologyHref, suspectHref, heading }: InsetTotalProps) {
  const parts = leftOut(total);
  const count = (n: number) => formatCount(n, false, locale);
  const labels = copy.figures;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "16px 20px" }}>
      {/* The amount fits the width of its own column, which wraps above the figures on a narrow screen. */}
      <Stack spacing={1} sx={{ flex: "2 1 360px", minWidth: 0, justifyContent: "center", containerType: "inline-size" }}>
        {heading}
        <TotalAmount total={total} locale={locale} methodologyHref={methodologyHref} methodologyLabel={copy.methodology} />
      </Stack>
      {total.records > 0 && <InsetFigure label={labels.records}>{formatCount(total.records, total.estimated, locale)}</InsetFigure>}
      {parts.suspect > 0 && (
        <InsetFigure label={labels.suspect} href={suspectHref}>
          {count(parts.suspect)}
        </InsetFigure>
      )}
      {parts.noValue > 0 && <InsetFigure label={labels.noValue}>{count(parts.noValue)}</InsetFigure>}
      {parts.hasCeilings && (
        <InsetFigure label={labels.ceilings}>
          <MoneyAmount bani={total.frameworkCeilings} locale={locale} />
        </InsetFigure>
      )}
    </Box>
  );
}
