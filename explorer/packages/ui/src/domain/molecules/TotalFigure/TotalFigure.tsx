import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { MoneyAmount, formatMoney } from "../../atoms/MoneyAmount/index.ts";
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
    <Stack spacing={0.25}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
        <Typography variant="h5" component="p">
          <MoneyAmount bani={total.awarded} locale={locale} />
        </Typography>
        <Link href={methodologyHref} aria-label={copy.methodology} underline="none">
          ⓘ
        </Link>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {copy.records(total.records, formatCount(total.records, total.estimated, locale))}
      </Typography>
      {parts.suspect > 0 && (
        <Typography variant="body2">
          <Link href={suspectHref}>{copy.suspectLeftOut(parts.suspect, count(parts.suspect))}</Link>
        </Typography>
      )}
      {parts.noValue > 0 && (
        <Typography variant="body2" color="text.secondary">
          {copy.noValue(parts.noValue, count(parts.noValue))}
        </Typography>
      )}
      {parts.hasCeilings && (
        <Typography variant="body2" color="text.secondary">
          {copy.frameworkCeilings(formatMoney(total.frameworkCeilings, locale))}
        </Typography>
      )}
    </Stack>
  );
}
