import type { Locale } from "../../../theme/index.ts";
import { formatPercent } from "../../utils/formatPercent.ts";

/**
 * Awards as a share of turnover, as a percentage with at most one decimal ("2%", "0.4%", "47.3%"). A share above 100% is shown as it is: a contract's whole value
 * counts in its award year, so it is no revenue share (the section's note says so). A nonzero share under 0.1% reads "<0.1%", never "0%".
 */
export function formatShare(ratio: number, locale: Locale): string {
  if (ratio > 0 && ratio < 0.001) return `<${formatPercent(0.001, locale)}`;
  return formatPercent(ratio, locale);
}
