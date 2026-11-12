import type { Party, RecordBadge } from "../../types.ts";

/** A Record with more than one winner is a consortium: its value is the full contract value, not any member's share. */
export const isConsortium = (winners: readonly Party[]): boolean => winners.length > 1;

/** The badges to chip: the consortium badge is dropped where the row's own consortium marker says the same. */
export function visibleBadges(badges: readonly RecordBadge[], consortium: boolean): RecordBadge[] {
  return consortium ? badges.filter((badge) => badge !== "CONSORTIUM_SHARE") : [...badges];
}
