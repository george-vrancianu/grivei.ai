import type { Locale } from "../../../theme/index.ts";
import type { PartyCoverageData } from "../../types.ts";

const SLICES = ["direct", "subordinate", "otherParties", "independent", "unattributed"] as const;

/**
 * The share of the set's awarded value that no Party is attributed to (central government, schools, municipal companies, ADIs, gaps in the mandates),
 * as formatted text ("57.9%", "57,9%"), or null when the set has no value to share. Exact bani are summed as integers: only the last step is a number.
 */
export function unattributedShare(coverage: PartyCoverageData, locale: Locale): string | null {
  const total = SLICES.reduce((sum, slice) => sum + BigInt(coverage[slice].awarded), 0n);
  if (total === 0n) return null;
  const unattributed = BigInt(coverage.unattributed.awarded);
  const tenths = (unattributed * 1000n + total - 1n) / total; // tenths of a percent, rounded up: never understates what is not attributed (a sliver is never shown as 0%)
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Number(tenths) / 1000);
}
