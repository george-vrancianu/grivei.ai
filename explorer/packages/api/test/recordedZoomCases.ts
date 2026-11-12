/**
 * The cases whose answers are recorded as the contract's `ZoomedCounty` fixtures (ticket #84): persisted-query requests
 * asked of the API on `archive-moneymap` after a real rebuild (seam 1). The block "recorded fixtures (#84)" in
 * `seam1.test.ts` compares each answer with `contract/src/fixtures/recorded/ZoomedCounty.json` and, with `RECORD_FIXTURES=1`,
 * rewrites it. The app's zoom sends the page's filter without `uat` (the choropleth stays whole while one UAT is chosen)
 * plus the county, so a UAT click needs no case of its own here: its main-screen answers are `county-with-uat` and
 * `bucharest-with-sector` among the MainScreen cases (`recordedCases.ts`).
 */
import type { RecordedCase } from "./recordedCases.ts";

export type RecordedZoomCase = RecordedCase & { operation: "ZoomedCounty" };

const zoom = (county: string, filter: Record<string, unknown> = {}) => ({ filter: { ...filter, county }, county });

export const RECORDED_ZOOM_CASES: readonly RecordedZoomCase[] = [
  { operation: "ZoomedCounty", name: "county-with-unknown-uat-row", kind: "typical", description: "Brasov county: five UATs with money and the row for the commune ANAF puts in the county but SIRUTA does not know", variables: zoom("RO-BV") },
  { operation: "ZoomedCounty", name: "county-without-unknown-uat-row", kind: "typical", description: "Cluj county: every authority has a UAT, so the unknown-UAT row is null", variables: zoom("RO-CJ") },
  { operation: "ZoomedCounty", name: "bucharest-by-sector", kind: "typical", description: "Bucharest by its sectors (the UATs of RO-B are the six sectors; only the ones with Records appear)", variables: zoom("RO-B") },
  { operation: "ZoomedCounty", name: "county-text-query", kind: "typical", description: "a text query inside the zoomed county: the UAT sums narrow with the filter", variables: zoom("RO-BV", { q: "comuna" }) },
  { operation: "ZoomedCounty", name: "county-no-match", kind: "empty", description: "nothing matches in the county: no UAT has money (every one draws grey), no unknown-UAT row", variables: zoom("RO-CJ", { q: "zzzzzz" }) },
];
