/** The width of a concentration bar, 0 to 100: a share of the total (0 to 1) as a percentage. No share (a zero total) is an empty bar. */
export function shareBarPercent(share: number | null): number {
  if (share === null || !Number.isFinite(share)) return 0;
  return Math.min(100, Math.max(0, share * 100));
}
