import type { ValueBucket } from "./generated/operations.ts";

export interface ValueBucketEdge {
  bucket: ValueBucket;
  /** Inclusive upper edge in bani; null for the open-ended top bucket. The lower edge is the previous bucket's. */
  upToBani: string | null;
  /** Where the edge comes from. */
  source: string;
}

/**
 * The preset awarded-value buckets, in bani (1 RON = 100 bani). Mirrors the `ValueBucket`
 * enum in schema/schema.graphql; the rollup cube is keyed by these. Upper edge inclusive,
 * so a purchase exactly at a statutory cap is "at or under the cap".
 */
export const VALUE_BUCKETS: readonly ValueBucketEdge[] = [
  { bucket: "UP_TO_10K", upToBani: "1000000", source: "round floor for small purchases (not statutory)" },
  { bucket: "UP_TO_135K", upToBani: "13506000", source: "direct-purchase cap, supplies and services, before 10 Sep 2022: 135,060 RON" },
  { bucket: "UP_TO_270K", upToBani: "27012000", source: "the same cap from 10 Sep 2022: 270,120 RON" },
  { bucket: "UP_TO_900K", upToBani: "90040000", source: "direct-purchase cap for works from 10 Sep 2022: 900,400 RON" },
  { bucket: "UP_TO_9M", upToBani: "900400000", source: "10x the works cap: top of the over-cap Signal band (9,004,000 RON)" },
  { bucket: "UP_TO_1B", upToBani: "100000000000", source: "1 bn RON: contract values from here are checked for suspect values" },
  { bucket: "OVER_1B", upToBani: null, source: "above 1 bn RON" },
];

/** The bucket an awarded value (bani, decimal string) falls in; null when the Record has no value. */
export function valueBucketOf(bani: string | null): ValueBucket | null {
  if (bani === null) return null;
  const v = BigInt(bani);
  for (const b of VALUE_BUCKETS) if (b.upToBani === null || v <= BigInt(b.upToBani)) return b.bucket;
  return null;
}
