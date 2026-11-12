/**
 * The cases whose answers are recorded as the contract's fixtures (ticket #83): each is one persisted-query request,
 * asked of the API on `archive-moneymap` after a real rebuild (seam 1). The block "recorded fixtures (#83)" in
 * `seam1.test.ts` compares each answer with the committed JSON and, with `RECORD_FIXTURES=1`, rewrites it.
 * The app's seam 3 tests ask for exactly these variables, so a case here is also a path a test can walk.
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export type RecordedOperation = "MainScreen" | "FullResultsAuthorities" | "FullResultsSuppliers" | "FullResultsRecords" | "ZoomedCounty" | "CoverageLens" | "CoveragePage";

export interface RecordedCase {
  operation: RecordedOperation;
  /** Unique within its operation. */
  name: string;
  kind: FixtureKind;
  description: string;
  variables: Record<string, unknown>;
}

const page = { limit: 50, offset: 0 };

export const RECORDED_CASES: readonly RecordedCase[] = [
  // The main screen: one query per filter, so the map, the totals and the tabs always agree.
  { operation: "MainScreen", name: "empty-filter-national", kind: "typical", description: "no filter: the national totals, the top 50 of each tab, National and Unplaced tiles", variables: { filter: {} } },
  { operation: "MainScreen", name: "text-query", kind: "typical", description: "a text query: map, totals and tabs all narrowed to the matching Records", variables: { filter: { q: "comuna" } } },
  { operation: "MainScreen", name: "text-query-title-match", kind: "typical", description: "a query that matches one Record's title: the matched field is TITLE, with its highlighted range", variables: { filter: { q: "sistem" } } },
  { operation: "MainScreen", name: "text-query-with-chip", kind: "typical", description: "a text query plus a channel chip", variables: { filter: { q: "comuna", channel: "DIRECT_PURCHASE" } } },
  { operation: "MainScreen", name: "county-authority-side", kind: "typical", description: "a county clicked on the map, counted by the authority's county", variables: { filter: { county: "RO-BV" } } },
  { operation: "MainScreen", name: "county-supplier-side", kind: "typical", description: "the same county counted by the supplier's county: a consortium's shares land in each winner's county", variables: { filter: { county: "RO-BV", countySide: "SUPPLIER" } } },
  { operation: "MainScreen", name: "unplaced-tile", kind: "typical", description: "the Unplaced tile chosen as the county: only the authorities no county could be found for", variables: { filter: { county: "UNPLACED" } } },
  { operation: "MainScreen", name: "supplier-side-unknown-county", kind: "typical", description: "the supplier-side map with no county picked: the unknown-supplier-county tile (a foreign firm, a natural person) is non-zero", variables: { filter: { countySide: "SUPPLIER" } } },
  { operation: "MainScreen", name: "text-query-with-county", kind: "typical", description: "a text query inside a clicked county", variables: { filter: { q: "comuna", county: "RO-BV" } } },
  { operation: "MainScreen", name: "go-to-entity", kind: "typical", description: "a query that is exactly one entity's name: the Go-to card", variables: { filter: { q: "SANTIERUL TARA DEMO SRL" } } },
  { operation: "MainScreen", name: "empty-no-match", kind: "empty", description: "nothing matches: zero totals, empty tabs, no Go-to card", variables: { filter: { q: "zzzzzz" } } },
  // The zoomed county (#84): the main screen for a county on the authority side, and a UAT clicked inside it.
  { operation: "MainScreen", name: "county-cluj", kind: "typical", description: "a second county zoomed into: no authority without a UAT, so no unknown-UAT row", variables: { filter: { county: "RO-CJ" } } },
  { operation: "MainScreen", name: "county-bucharest", kind: "typical", description: "Bucharest chosen: its Records sit in the sectors", variables: { filter: { county: "RO-B" } } },
  { operation: "MainScreen", name: "county-with-uat", kind: "typical", description: "a UAT clicked inside a zoomed county: map, Total and tabs narrowed to its authorities", variables: { filter: { county: "RO-BV", uat: "880010" } } },
  { operation: "MainScreen", name: "bucharest-with-sector", kind: "typical", description: "one Bucharest sector clicked", variables: { filter: { county: "RO-B", uat: "179169" } } },
  { operation: "MainScreen", name: "empty-county-no-match", kind: "empty", description: "a county zoomed into with a query nothing matches: zero totals, empty tabs", variables: { filter: { q: "zzzzzz", county: "RO-CJ" } } },
  // The full-results view: the same filter, one tab, a page at a time (limit 50 as the app asks).
  { operation: "FullResultsAuthorities", name: "empty-filter", kind: "typical", description: "authorities, first page, no filter", variables: { filter: {}, ...page } },
  { operation: "FullResultsAuthorities", name: "county-authority-side", kind: "typical", description: "authorities of a clicked county", variables: { filter: { county: "RO-BV" }, ...page } },
  { operation: "FullResultsAuthorities", name: "empty-no-match", kind: "empty", description: "no authority matches", variables: { filter: { q: "zzzzzz" }, ...page } },
  { operation: "FullResultsSuppliers", name: "empty-filter", kind: "typical", description: "suppliers, first page, no filter (the default view of /explore/search)", variables: { filter: {}, ...page } },
  { operation: "FullResultsSuppliers", name: "county-supplier-side", kind: "typical", description: "suppliers seated in a county", variables: { filter: { county: "RO-BV", countySide: "SUPPLIER" }, ...page } },
  { operation: "FullResultsSuppliers", name: "empty-no-match", kind: "empty", description: "no supplier matches", variables: { filter: { q: "zzzzzz" }, ...page } },
  { operation: "FullResultsRecords", name: "empty-filter", kind: "typical", description: "Records, first page, no filter, the default order", variables: { filter: {}, ...page } },
  { operation: "FullResultsRecords", name: "text-query-by-date", kind: "typical", description: "a text query, ordered by date, with the matched field on each row", variables: { filter: { q: "comuna" }, ...page, order: "DATE_DESC" } },
  { operation: "FullResultsRecords", name: "text-query-with-county", kind: "typical", description: "a text query inside a clicked county", variables: { filter: { q: "comuna", county: "RO-BV" }, ...page } },
  { operation: "FullResultsRecords", name: "empty-no-match", kind: "empty", description: "no Record matches", variables: { filter: { q: "zzzzzz" }, ...page } },
];
