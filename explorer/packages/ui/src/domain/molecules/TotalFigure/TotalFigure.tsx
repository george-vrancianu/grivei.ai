import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { type } from "../../../theme/tokens.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { fitSize } from "../../utils/fitSize.ts";
import { neutralLinkSx } from "../../utils/neutralLinkSx.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import { InsetFigure } from "../InsetFigure/index.ts";
import { withNodes } from "../../utils/withNodes.tsx";
import type { Total } from "../../types.ts";
import { leftOut } from "./totalFigure.utils.ts";

/** Copy that depends on a count: gets the number (for plural rules) and its locale-formatted text. */
export type CountCopy = (count: number, formatted: string) => string;

export interface TotalFigureCopy {
  /** "9 Records", "≈ 2.4M Records" */
  records: CountCopy;
  /** "1 Record left out as a suspect value" */
  suspectLeftOut: CountCopy;
  /** "5 Records with no value" */
  noValue: CountCopy;
  /** "Framework ceilings RON 100,000,000 not counted"; gets the formatted amount. */
  frameworkCeilings: (formattedAmount: string) => string;
  /** The ⓘ link's accessible name, e.g. "How this total is counted". */
  methodology: string;
}

/** The labels of the inset figures (the value is the count or the amount): fixed text, so a count of one reads the same as many. */
export interface InsetFigureLabels {
  records: string;
  suspect: string;
  noValue: string;
  ceilings: string;
}

/** The copy of a Total that can take the inset layout. */
export type InsetTotalCopy = TotalFigureCopy & { figures: InsetFigureLabels };

interface TotalFigureBase {
  total: Total;
  locale: Locale;
  /** The methodology page; the ⓘ links here. */
  methodologyHref: string;
  /** Where the suspect Records are listed; required, so a Total can never leave them out without a way to see them. */
  suspectHref: string;
}

/**
 * Two layouts. Stacked (the default, the entity page, the Records tab and the Money lens): the amount, then one line of what it left out.
 * Inset (the main screen, which opts in): the amount on the left, each part that is not zero as an inset figure beside it, wrapping under it on a narrow screen.
 */
export type TotalFigureProps = TotalFigureBase &
  ({ copy: TotalFigureCopy; inset?: undefined } | { copy: InsetTotalCopy; inset: { /** Shown above the amount, in the amount's column. */ heading?: ReactNode } });

/**
 * A Total: the awarded value and what it left out. A Total always says what it left out,
 * so the parts that are zero are the ones that stay silent (the Records count is the one line a Total always has).
 */
export function TotalFigure({ total, locale, copy, methodologyHref, suspectHref, inset }: TotalFigureProps) {
  const parts = leftOut(total);
  const count = (n: number) => formatCount(n, false, locale);
  const amount = (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5 }} useFlexGap>
      {/* The one accent-coloured number on the screen: the `total` variant. */}
      <Typography variant="total" component="p" sx={{ fontSize: fitSize(type.total.size), overflowWrap: "anywhere" }}>
        <MoneyAmount bani={total.awarded} locale={locale} />
      </Typography>
      <Link href={methodologyHref} aria-label={copy.methodology} underline="none" sx={neutralLinkSx}>
        ⓘ
      </Link>
    </Stack>
  );
  if (inset) {
    const labels = (copy as InsetTotalCopy).figures;
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "16px 20px" }}>
        {/* The amount fits the width of its own column, which wraps above the figures on a narrow screen. */}
        <Stack spacing={1} sx={{ flex: "2 1 360px", minWidth: 0, justifyContent: "center", containerType: "inline-size" }}>
          {inset.heading}
          {amount}
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
  return (
    <Stack spacing={0.75} sx={{ containerType: "inline-size" }}>
      {amount}
      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", columnGap: 3.5, rowGap: 0.5, alignItems: "baseline" }}>
        <Typography variant="label" component="p" color="text.secondary">
          {copy.records(total.records, formatCount(total.records, total.estimated, locale))}
        </Typography>
        {parts.suspect > 0 && (
          <Typography variant="label" component="p">
            <Link href={suspectHref} sx={neutralLinkSx}>
              {copy.suspectLeftOut(parts.suspect, count(parts.suspect))}
            </Link>
          </Typography>
        )}
        {parts.noValue > 0 && (
          <Typography variant="label" component="p" color="text.secondary">
            {copy.noValue(parts.noValue, count(parts.noValue))}
          </Typography>
        )}
        {parts.hasCeilings && (
          <Typography variant="label" component="p" color="text.secondary">
            {withNodes(copy.frameworkCeilings, [<MoneyAmount bani={total.frameworkCeilings} locale={locale} />])}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
