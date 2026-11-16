import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { neutralLinkSx } from "../../../../utils/neutralLinkSx.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import type { Total } from "../../../../types.ts";
import type { TotalFigureCopy } from "../../totalFigure.types.ts";
import { leftOut } from "../../totalFigure.utils.ts";
import { TotalAmount } from "../TotalAmount/index.ts";

export interface StackedTotalProps {
  total: Total;
  locale: Locale;
  copy: TotalFigureCopy;
  methodologyHref: string;
  suspectHref: string;
}

/** The stacked layout (the default): the amount, then one line of what it left out. */
export function StackedTotal({ total, locale, copy, methodologyHref, suspectHref }: StackedTotalProps) {
  const parts = leftOut(total);
  const count = (n: number) => formatCount(n, false, locale);
  return (
    <Stack spacing={0.75} sx={{ containerType: "inline-size" }}>
      <TotalAmount total={total} locale={locale} methodologyHref={methodologyHref} methodologyLabel={copy.methodology} />
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
