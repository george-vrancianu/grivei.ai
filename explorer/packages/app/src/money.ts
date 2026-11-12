import type { Locale } from "@grivei/ui";

const TAG: Record<Locale, string> = { en: "en-GB", ro: "ro-RO" };

/** `Bani` is integer bani (1/100 RON) as a decimal string. Formats it as RON without ever going through a float. */
export function formatBani(bani: string, locale: Locale): string {
  const negative = bani.startsWith("-");
  const digits = (negative ? bani.slice(1) : bani).padStart(3, "0");
  const decimal = `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
  return new Intl.NumberFormat(TAG[locale], { style: "currency", currency: "RON", currencyDisplay: "code" }).format(decimal as never);
}
