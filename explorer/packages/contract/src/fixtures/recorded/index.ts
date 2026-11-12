// Fixtures recorded from seam 1 runs (tickets #83, #84, #90): the API's own answers to the main screen, full-results
// zoomed-county and Coverage operations, after a real rebuild of `watchdog/tests/fixtures/archive-moneymap` (#90: the joined `archive-mf` + `archive-coverage` world). Nothing here is hand-written: the
// JSON is rewritten by `RECORD_FIXTURES=1` (see ../../../README.md) and the seam 1 blocks "recorded fixtures (#83)", "(#84)" and "(#90)"
// fails when the API drifts from it. Typed here, validated against the operations by fixtures.test.ts.
import type {
  CoverageLensQuery, CoverageLensQueryVariables, CoveragePageQuery, CoveragePageQueryVariables, FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables, FullResultsRecordsQuery, FullResultsRecordsQueryVariables,
  FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables, MainScreenQuery, MainScreenQueryVariables, ZoomedCountyQuery, ZoomedCountyQueryVariables,
} from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import coverageLensJson from "./CoverageLens.json" with { type: "json" };
import coveragePageJson from "./CoveragePage.json" with { type: "json" };
import fullResultsAuthoritiesJson from "./FullResultsAuthorities.json" with { type: "json" };
import fullResultsRecordsJson from "./FullResultsRecords.json" with { type: "json" };
import fullResultsSuppliersJson from "./FullResultsSuppliers.json" with { type: "json" };
import mainScreenJson from "./MainScreen.json" with { type: "json" };
import zoomedCountyJson from "./ZoomedCounty.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of
// `data` is checked against the operation by the fixture tests, so the casts here are the typed door.
export const recordedMainScreen = mainScreenJson as unknown as FixtureSet<MainScreenQuery, MainScreenQueryVariables>;
export const recordedFullResultsAuthorities = fullResultsAuthoritiesJson as unknown as FixtureSet<FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables>;
export const recordedFullResultsSuppliers = fullResultsSuppliersJson as unknown as FixtureSet<FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables>;
export const recordedFullResultsRecords = fullResultsRecordsJson as unknown as FixtureSet<FullResultsRecordsQuery, FullResultsRecordsQueryVariables>;
export const recordedZoomedCounty = zoomedCountyJson as unknown as FixtureSet<ZoomedCountyQuery, ZoomedCountyQueryVariables>;
export const recordedCoverageLens = coverageLensJson as unknown as FixtureSet<CoverageLensQuery, CoverageLensQueryVariables>;
export const recordedCoveragePage = coveragePageJson as unknown as FixtureSet<CoveragePageQuery, CoveragePageQueryVariables>;
