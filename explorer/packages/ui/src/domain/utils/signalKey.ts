/** What identifies a Signal on a screen: its rule, date and reproducing filter (and the count of its Records, when the screen knows it). */
interface Keyed {
  rule: string;
  date: string;
  reproduce: object;
  recordCount?: number;
}

/**
 * React keys for a list of Signals: one per Signal, the same way everywhere. Two Signals can share rule, date and filter (two framework overruns
 * of one authority with the same window and no supplier), so a repeat gets its place in the list appended.
 */
export function signalKeys(signals: readonly Keyed[]): string[] {
  const seen = new Map<string, number>();
  return signals.map((s) => {
    const base = `${s.rule}|${s.date}|${JSON.stringify(s.reproduce)}|${s.recordCount ?? ""}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}#${n}`;
  });
}
