import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { type } from "../../../../../theme/tokens.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { fitSize } from "../../../../utils/fitSize.ts";
import { neutralLinkSx } from "../../../../utils/neutralLinkSx.ts";
import type { Total } from "../../../../types.ts";

export interface TotalAmountProps {
  total: Total;
  locale: Locale;
  methodologyHref: string;
  /** The ⓘ link's accessible name. */
  methodologyLabel: string;
}

/** The awarded amount and the ⓘ link to the methodology, shared by both layouts. */
export function TotalAmount({ total, locale, methodologyHref, methodologyLabel }: TotalAmountProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5 }} useFlexGap>
      {/* The one accent-coloured number on the screen: the `total` variant. */}
      <Typography variant="total" component="p" sx={{ fontSize: fitSize(type.total.size), overflowWrap: "anywhere" }}>
        <MoneyAmount bani={total.awarded} locale={locale} />
      </Typography>
      <Link href={methodologyHref} aria-label={methodologyLabel} underline="none" sx={neutralLinkSx}>
        ⓘ
      </Link>
    </Stack>
  );
}
