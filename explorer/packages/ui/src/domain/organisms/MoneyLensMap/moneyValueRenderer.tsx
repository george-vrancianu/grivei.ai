import type { ReactNode } from "react";
import type { Locale } from "../../../theme/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import type { Total } from "../../types.ts";

/**
 * The base map's `renderValue` for money: the same amount `moneyValueFormatter` formats, drawn as a `MoneyAmount` (the money variant),
 * for the default tooltip and the legend ends. The exact Bani string of the area's Total when the code has one, else the rounded colour value.
 */
export function moneyValueRenderer(totals: ReadonlyMap<string, Total>, locale: Locale): (value: number, code?: string) => ReactNode {
  return (value, code) => {
    const total = code === undefined ? undefined : totals.get(code);
    return <MoneyAmount bani={total ? total.awarded : String(Math.round(value))} locale={locale} />;
  };
}
