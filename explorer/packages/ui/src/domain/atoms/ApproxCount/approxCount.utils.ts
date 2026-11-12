import type { Locale } from "../../../theme/index.ts";

/** A count in the locale's number format, led by "≈" (and a no-break space) when it is an estimate. */
export function formatCount(count: number, estimated: boolean, locale: Locale): string {
  const text = new Intl.NumberFormat(locale).format(count);
  return estimated ? `≈\u00a0${text}` : text;
}
