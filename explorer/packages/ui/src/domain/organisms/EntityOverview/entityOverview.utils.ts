import type { Bani, EntityRole, RecordRow } from "../../types.ts";

/** The Records the Overview may list as "largest": only counted ones. A suspect value or a framework ceiling has no counted value and never ranks, even if the API sends it. */
export function countedRecords<R extends Pick<RecordRow, "counted">>(rows: readonly R[]): R[] {
  return rows.filter((row) => row.counted !== null);
}

/**
 * `part` as a share of `whole` (both integer bani strings), between 0 and 1, to four decimals. Exact on big amounts (no Number() on bani);
 * null when the whole is zero, so no share can be told.
 */
export function shareOfTotal(part: Bani, whole: Bani): number | null {
  const total = BigInt(whole);
  if (total <= 0n) return null;
  const scaled = (BigInt(part) * 10_000n) / total;
  return Math.min(1, Math.max(0, Number(scaled) / 10_000));
}

/** The side a counterparty is on: an authority's counterparties are suppliers, a supplier's are authorities. */
export const counterpartyRole = (role: EntityRole): EntityRole => (role === "authority" ? "supplier" : "authority");

/** The id of the Overview's Signals section, the same in both languages: a link to `#signals` (the "n Signals" chip of an entity row) scrolls to it. */
export const SIGNALS_ANCHOR = "signals";

/** The width of a concentration bar, 0 to 100: a share of the total (0 to 1) as a percentage. No share (a zero total) is an empty bar. */
export function shareBarPercent(share: number | null): number {
  if (share === null || !Number.isFinite(share)) return 0;
  return Math.min(100, Math.max(0, share * 100));
}
