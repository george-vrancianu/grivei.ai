import type { FirmDonationData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { Locale } from "../../../theme/index.ts";

/**
 * What the date column shows for a donation. The date BaniPartide's cell reads as one calendar date is shown formatted; any other published cell (several dates, a
 * range, a typo) is shown verbatim, as source data, because no date was claimed from it; with no cell at all the year the row is filed under; with neither, null (the row says "not stated").
 */
export function donationWhen(d: Pick<FirmDonationData, "date" | "dateText" | "year">, locale: Locale): string | null {
  if (d.date) return formatDate(d.date, locale, "long");
  if (d.dateText.trim()) return d.dateText.trim();
  return d.year === null ? null : String(d.year);
}
