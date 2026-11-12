import type { Locale } from "../../../theme/index.ts";
import type { SignalRuleBaseRateData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { SignalRuleBaseRateCopy } from "./SignalRuleBaseRate.tsx";

/**
 * A fraction as a percentage in the locale's format, at most two decimals. A rate above zero never reads "0%": below a hundredth of a percent
 * it reads "<0.01%", so "fires for a few authorities" is not mistaken for "fires for none".
 */
export function formatBaseRate(rate: number, locale: Locale): string {
  const format = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
  return rate > 0 && rate < 0.0001 ? `<${format.format(0.0001)}` : format.format(rate);
}

/** The window as words. An open start (null) says so; an open end runs to the data-through date, the last day the loaded data covers. */
export function windowWords(rule: SignalRuleBaseRateData, locale: Locale, copy: SignalRuleBaseRateCopy): string {
  const to = formatDate(rule.window.to ?? rule.dataThrough, locale, "long");
  return rule.window.from === null ? copy.openStart(to) : copy.range(formatDate(rule.window.from, locale, "long"), to);
}

/** The base rate as words; a rate of zero says that no authority had one, rather than "0%". */
export function baseRateWords(rule: SignalRuleBaseRateData, locale: Locale, copy: SignalRuleBaseRateCopy): string {
  return rule.baseRate === 0 ? copy.none(rule.baseRateYear) : copy.rate(formatBaseRate(rule.baseRate, locale), rule.baseRateYear);
}
