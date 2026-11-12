import type { RecordPageData } from "../../types.ts";

/** Why a Record has no counted value: its value is suspect, it is a framework ceiling, or SEAP publishes none. `null` when it is counted. */
export type NotCountedReason = "suspect" | "frameworkCeiling" | "noValue" | "other";

export function notCountedReason(record: Pick<RecordPageData, "counted" | "value" | "suspect" | "badges">): NotCountedReason | null {
  if (record.counted !== null) return null;
  if (record.suspect !== null || record.badges.includes("SUSPECT_VALUE")) return "suspect";
  if (record.badges.includes("FRAMEWORK_CEILING")) return "frameworkCeiling";
  if (record.value === null) return "noValue";
  return "other";
}

/** More than one winner: a consortium. */
export const isConsortium = (record: Pick<RecordPageData, "winners">): boolean => record.winners.length > 1;

/** A framework ratio (1.124) as a percentage ("112.4%"), one decimal at most, in the locale's format. */
export { formatPercent as formatRatio } from "../../utils/formatPercent.ts";
