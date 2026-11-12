/**
 * The cases whose answers are recorded as the contract's `CoverageLens` and `CoveragePage` fixtures (ticket #90): persisted-query
 * requests asked of the API after a real rebuild of one joined world: the placement world (14 authorities, DA Records dated 2023-03), the Ministry of Finance
 * list slice (`archive-mf`: snapshot 2026-11-01, M) and the Coverage archive (`archive-coverage`: every gap state, a quarantined 2022 Q2 DA file,
 * crawled and backfilled quarters), rebuilt as of 2025-09-20 with both known-gaps files joined. The block "recorded fixtures (#90)" in
 * `seam1.test.ts` compares each answer with `contract/src/fixtures/recorded/{CoverageLens,CoveragePage}.json` and, with
 * `RECORD_FIXTURES=1`, rewrites them. The app's seam 3 tests walk exactly these variables: the date chip's window is the lens's
 * window (`{}` with no chip), the Coverage page and the lens's compact grid always ask for the whole grid (`{}`).
 */
import type { RecordedCase } from "./recordedCases.ts";

export type RecordedCoverageCase = RecordedCase & { operation: "CoverageLens" | "CoveragePage" };

const window = (from?: string, to?: string) => ({ window: { ...(from ? { from } : {}), ...(to ? { to } : {}) } });

export const RECORDED_COVERAGE_CASES: readonly RecordedCoverageCase[] = [
  { operation: "CoverageLens", name: "open-window", kind: "typical", description: "no date chip: the whole harvest; PARTIAL because the 2022 Q2 DA file is quarantined; N of M and the other authorities over every Record, 3 unplaced authorities; SEAP harvested through per kind, four planned Sources", variables: {} },
  { operation: "CoverageLens", name: "from-2023", kind: "typical", description: "a date chip with only its start (the From year select set first): the window is open-ended", variables: window("2023-01-01") },
  { operation: "CoverageLens", name: "year-2023", kind: "typical", description: "the 2023 year chip: past the quarantined quarter, so harvested with known gaps (hand-entered 2023 Q1 gaps); the unplaced tally falls to the authorities with Records dated 2023", variables: window("2023-01-01", "2023-12-31") },
  { operation: "CoverageLens", name: "year-2022", kind: "typical", description: "the 2022 year chip: reaches the quarantined 2022 Q2 DA file, so PARTIAL, and no placed authority has a Record dated 2022 (N is 0, M is the list's)", variables: window("2022-01-01", "2022-12-31") },
  { operation: "CoverageLens", name: "narrow-days", kind: "typical", description: "six days inside the loaded 2023 quarter: the status is the quarter's, N and the other authorities fall to the Records dated in the window, M stays the list's", variables: window("2023-03-11", "2023-03-16") },
  { operation: "CoverageLens", name: "before-harvest", kind: "empty", description: "a window that ends before the grid starts: every county NOT_HARVESTED, N 0, no unplaced authorities; M is still the list's", variables: { window: { to: "2020-12-31" } } },
  { operation: "CoveragePage", name: "whole-grid", kind: "typical", description: "the whole grid (no window): 2021 Q1 .. 2025 Q3 x four kinds in every gap state, data-through per kind, the hand-entered gaps with their notes, the MF snapshot date; what the Coverage page and the lens's compact grid ask for", variables: {} },
  { operation: "CoveragePage", name: "year-2023-grid", kind: "typical", description: "the grid cut to the quarters of 2023: the API returns only the quarters overlapping the window", variables: window("2023-01-01", "2023-12-31") },
];
