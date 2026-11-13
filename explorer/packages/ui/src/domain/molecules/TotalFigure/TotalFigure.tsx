import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { type } from "../../../theme/tokens.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { fitSize } from "../../utils/fitSize.ts";
import { neutralLinkSx } from "../../utils/neutralLinkSx.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
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

export interface TotalFigureProps {
  total: Total;
  locale: Locale;
  copy: TotalFigureCopy;
  /** The methodology page; the ⓘ links here. */
  methodologyHref: string;
  /** Where the suspect Records are listed; required, so a Total can never leave them out without a way to see them. */
  suspectHref: string;
}

/**
 * A Total: the awarded value and what it left out. A Total always says what it left out,
 * so the parts that are zero are the ones that stay silent.
 */
export function TotalFigure({ total, locale, copy, methodologyHref, suspectHref }: TotalFigureProps) {
  const parts = leftOut(total);
  const count = (n: number) => formatCount(n, false, locale);
  return (
    <Stack spacing={0.75} sx={{ containerType: "inline-size" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5 }} useFlexGap>
        {/* The one accent-coloured number on the screen: the `total` variant. */}
        <Typography variant="total" component="p" sx={{ fontSize: fitSize(type.total.size), overflowWrap: "anywhere" }}>
          <MoneyAmount bani={total.awarded} locale={locale} />
        </Typography>
        <Link href={methodologyHref} aria-label={copy.methodology} underline="none" sx={neutralLinkSx}>
          ⓘ
        </Link>
      </Stack>
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
