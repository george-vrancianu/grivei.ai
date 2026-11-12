import type { Locale } from "../../../theme/index.ts";

/** `Bani` is a plain decimal-integer string; anything else is a bug upstream, so fail loudly. */
const BANI = /^(-?)(\d+)$/;

/**
 * Integer bani (1/100 RON) as an exact decimal RON string ("123456" -> "1234.56").
 * String math only: amounts beyond Number.MAX_SAFE_INTEGER must not lose a digit.
 */
export function baniToRon(bani: string): `${number}` {
  const match = BANI.exec(bani);
  if (!match) throw new Error(`Not an integer bani amount: ${JSON.stringify(bani)}`);
  const [, sign, digits] = match;
  const padded = digits!.padStart(3, "0");
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  return `${sign}${whole}.${padded.slice(-2)}` as `${number}`;
}

export interface FormatMoneyOptions {
  /** Show the bani (two decimals). Default false: whole RON, rounded half away from zero. */
  showBani?: boolean;
  /** Short form ("1.4M RON" / "1,4 mil. RON") for tight spots; the full amount belongs in a tooltip. */
  compact?: boolean;
}

/**
 * RON in the reader's language. Whole lei by default: the figures are sums of
 * thousands of Records, where bani are noise. `Intl` formats the exact decimal string,
 * so a > 2^53 bani amount keeps every digit.
 */
export function formatMoney(bani: string, locale: Locale, { showBani = false, compact = false }: FormatMoneyOptions = {}): string {
  const fractionDigits = showBani && !compact ? 2 : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RON",
    currencyDisplay: "code",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: compact ? 1 : fractionDigits,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(baniToRon(bani));
}
