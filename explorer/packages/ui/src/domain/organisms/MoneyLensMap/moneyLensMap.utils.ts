import type { Locale } from "../../../theme/index.ts";
import { formatMoney } from "../../atoms/MoneyAmount/index.ts";
import type { MoneyMap, Total } from "../../types.ts";

/** One value per county for the base map: the awarded value in bani as a number. Only the colour reads it; display always uses the exact Bani string. */
export function moneyMapValues(map: Pick<MoneyMap, "counties">): Record<string, number> {
  return Object.fromEntries(map.counties.map((county) => [county.area, Number(county.total.awarded)]));
}

/** Each county's Total by code, so the formatters can show the exact Bani string and Records count. */
export function totalsByCounty(map: Pick<MoneyMap, "counties">): ReadonlyMap<string, Total> {
  return new Map(map.counties.map((county) => [county.area, county.total]));
}

/**
 * The base map's `formatValue` for money: the exact Bani string of the area's Total when the code has one, never the number.
 * Only a legend end (no code) falls back to the rounded colour value.
 */
export function moneyValueFormatter(totals: ReadonlyMap<string, Total>, locale: Locale): (value: number, code?: string) => string {
  return (value, code) => {
    const total = code === undefined ? undefined : totals.get(code);
    return formatMoney(total ? total.awarded : String(Math.round(value)), locale);
  };
}
