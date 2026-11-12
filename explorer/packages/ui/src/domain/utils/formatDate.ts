import type { Locale } from "../../theme/index.ts";

/** An ISO calendar date (`2024-09-30`) or instant (`2024-09-30T08:00:00Z`) in the locale's format, read as UTC so it never shifts a day. English uses day-month-year (en-GB) like Romanian. */
export function formatDate(date: string, locale: Locale, dateStyle: "medium" | "long" = "medium"): string {
  const instant = date.includes("T") ? date : `${date}T00:00:00Z`;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { dateStyle, timeZone: "UTC" }).format(new Date(instant));
}
