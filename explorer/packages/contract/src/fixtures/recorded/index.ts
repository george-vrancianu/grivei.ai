// Fixtures recorded from seam 1 runs (ticket #83): the API's own answers to the main screen and full-results
// operations, after a real rebuild of `watchdog/tests/fixtures/archive-moneymap`. Nothing here is hand-written: the
// JSON is rewritten by `RECORD_FIXTURES=1` (see ../../../README.md) and the seam 1 block "recorded fixtures (#83)"
// fails when the API drifts from it. Typed here, validated against the operations by fixtures.test.ts.
import type {
  FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables, FullResultsRecordsQuery, FullResultsRecordsQueryVariables,
  FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables, MainScreenQuery, MainScreenQueryVariables,
} from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import fullResultsAuthoritiesJson from "./FullResultsAuthorities.json" with { type: "json" };
import fullResultsRecordsJson from "./FullResultsRecords.json" with { type: "json" };
import fullResultsSuppliersJson from "./FullResultsSuppliers.json" with { type: "json" };
import mainScreenJson from "./MainScreen.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of
// `data` is checked against the operation by the fixture tests, so the casts here are the typed door.
export const recordedMainScreen = mainScreenJson as unknown as FixtureSet<MainScreenQuery, MainScreenQueryVariables>;
export const recordedFullResultsAuthorities = fullResultsAuthoritiesJson as unknown as FixtureSet<FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables>;
export const recordedFullResultsSuppliers = fullResultsSuppliersJson as unknown as FixtureSet<FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables>;
export const recordedFullResultsRecords = fullResultsRecordsJson as unknown as FixtureSet<FullResultsRecordsQuery, FullResultsRecordsQueryVariables>;
