// Fixtures recorded from seam 1 runs (ticket #89): the API's own answers about Signals, after a real rebuild of
// `watchdog/tests/fixtures/archive-signals`, `archive-splitting` and `archive-framework-overrun` (the seam 1 block "recorded fixtures (#89)",
// cases in `packages/api/test/recordedSignalCases.ts`). Nothing here is hand-written: the JSON under ./signals/ is rewritten by
// `RECORD_FIXTURES=1` (see ../../../README.md) and the block fails when the API drifts from it.
//  - EntityOverview: authorities and suppliers with Signals of each rule, a consortium member, a supplier in three authorities.
//  - EntityRelationships: counterparties with rings (`hasSignals`).
//  - EntityRecords: one case per Signal shown (its own reproducing filter, exactly what the Records tab asks), derived from the Overviews.
//  - RecordPage: Records in a framework-overrun Signal (and one outside it), a one-Record over-cap Signal.
//  - MainScreen and FullResults*: the has-Signals chip on and off.
//  - MethodologyBaseRates: each archive's `signalRules`, which no single archive can fill for all four rules at once.
import type {
  EntityOverviewQuery, EntityOverviewQueryVariables, EntityRecordsQuery, EntityRecordsQueryVariables, EntityRelationshipsQuery, EntityRelationshipsQueryVariables,
  FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables, FullResultsRecordsQuery, FullResultsRecordsQueryVariables,
  FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables, MainScreenQuery, MainScreenQueryVariables,
  MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables, RecordPageQuery, RecordPageQueryVariables,
} from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import entityOverviewJson from "./signals/EntityOverview.json" with { type: "json" };
import entityRecordsJson from "./signals/EntityRecords.json" with { type: "json" };
import entityRelationshipsJson from "./signals/EntityRelationships.json" with { type: "json" };
import fullResultsAuthoritiesJson from "./signals/FullResultsAuthorities.json" with { type: "json" };
import fullResultsRecordsJson from "./signals/FullResultsRecords.json" with { type: "json" };
import fullResultsSuppliersJson from "./signals/FullResultsSuppliers.json" with { type: "json" };
import mainScreenJson from "./signals/MainScreen.json" with { type: "json" };
import methodologyJson from "./signals/MethodologyBaseRates.json" with { type: "json" };
import recordPageJson from "./signals/RecordPage.json" with { type: "json" };

// JSON carries `kind` as a plain string; the shape of `data` is checked against the operation by the fixture tests, so the casts are the typed door.
export const recordedSignalsEntityOverview = entityOverviewJson as unknown as FixtureSet<EntityOverviewQuery, EntityOverviewQueryVariables>;
export const recordedSignalsEntityRecords = entityRecordsJson as unknown as FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables>;
export const recordedSignalsEntityRelationships = entityRelationshipsJson as unknown as FixtureSet<EntityRelationshipsQuery, EntityRelationshipsQueryVariables>;
export const recordedSignalsRecordPage = recordPageJson as unknown as FixtureSet<RecordPageQuery, RecordPageQueryVariables>;
export const recordedSignalsMainScreen = mainScreenJson as unknown as FixtureSet<MainScreenQuery, MainScreenQueryVariables>;
export const recordedSignalsFullResultsAuthorities = fullResultsAuthoritiesJson as unknown as FixtureSet<FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables>;
export const recordedSignalsFullResultsSuppliers = fullResultsSuppliersJson as unknown as FixtureSet<FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables>;
export const recordedSignalsFullResultsRecords = fullResultsRecordsJson as unknown as FixtureSet<FullResultsRecordsQuery, FullResultsRecordsQueryVariables>;
export const recordedSignalsMethodology = methodologyJson as unknown as FixtureSet<MethodologyBaseRatesQuery, MethodologyBaseRatesQueryVariables>;
