import type { Locale } from "../../theme/index.ts";

/** A ratio (0.82, 1.124) as a percentage ("82%", "112.4%"), one decimal at most, in the locale's format. */
export function formatPercent(ratio: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}
