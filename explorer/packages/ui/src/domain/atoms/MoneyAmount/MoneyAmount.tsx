import type { Bani } from "../../types.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatMoney, type FormatMoneyOptions } from "./moneyAmount.utils.ts";

export interface MoneyAmountProps extends FormatMoneyOptions {
  /** Integer bani as a decimal string (the contract's `Bani`). */
  bani: Bani;
  locale: Locale;
}

/** An amount of money as RON in the active language. A compact amount carries the full one as its title. */
export function MoneyAmount({ bani, locale, showBani, compact }: MoneyAmountProps) {
  const text = formatMoney(bani, locale, { showBani, compact });
  const full = compact ? formatMoney(bani, locale, { showBani: true }) : undefined;
  return <span title={full}>{text}</span>;
}
