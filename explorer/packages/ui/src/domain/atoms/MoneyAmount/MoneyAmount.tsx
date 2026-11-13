import { Typography } from "../../../atoms/Typography/index.ts";
import type { Bani } from "../../types.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatMoney, type FormatMoneyOptions } from "./moneyAmount.utils.ts";

export interface MoneyAmountProps extends FormatMoneyOptions {
  /** Integer bani as a decimal string (the contract's `Bani`). */
  bani: Bani;
  locale: Locale;
}

/**
 * An amount of money as RON in the active language, in the theme's `money` variant (Plex Mono, tabular figures); it keeps the size and
 * line height of the text around it, so a big total stays big. A compact amount carries the full one as its title.
 */
export function MoneyAmount({ bani, locale, showBani, compact }: MoneyAmountProps) {
  const text = formatMoney(bani, locale, { showBani, compact });
  const full = compact ? formatMoney(bani, locale, { showBani: true }) : undefined;
  return (
    <Typography component="span" variant="money" title={full} sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
      {text}
    </Typography>
  );
}
