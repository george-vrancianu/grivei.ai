import type { Locale } from "../../theme/index.ts";

/** An ISO calendar date (`2024-09-30`) or instant (`2024-09-30T08:00:00Z`) in the locale's format, read as UTC so it never shifts a day. English uses day-month-year (en-GB) like Romanian. */
export function formatDate(date: string, locale: Locale, dateStyle: "medium" | "long" = "medium"): string {
  const instant = date.includes("T") ? date : `${date}T00:00:00Z`;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { dateStyle, timeZone: "UTC" }).format(new Date(instant));
}

/** "2024-01" as a short month and year in the locale's format (UTC, so no time zone moves it); English uses en-GB like `formatDate`. Unparseable input is returned as is. */
export function formatMonth(month: string, locale: Locale): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
