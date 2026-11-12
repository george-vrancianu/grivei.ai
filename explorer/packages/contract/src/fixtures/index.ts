// Mock fixtures: one set per persisted operation (hand-written, or recorded from seam 1 where recorded/ has the operation), typed by the generated operation types
// and validated against the schema and the operation in CI (fixtures.test.ts).
import type { Fixture } from "./types.ts";
import { coverageLens, coveragePage } from "./coverage.ts";
import { entityOverviewHand, entityRecordsHand, entityRelationships } from "./entity.ts";
import { fullResultsAuthoritiesHand, fullResultsRecordsHand, fullResultsSuppliersHand } from "./full-results.ts";
import { mainScreenHand } from "./main-screen.ts";
import { methodologyBaseRates } from "./methodology.ts";
import { recordPageHand } from "./record-page.ts";
import { recordedEntityOverview } from "./recorded/entity.ts";
import { recordedEntityRecords } from "./recorded/records.ts";
import { recordedRecordPage } from "./recorded/record.ts";
import {
  recordedSignalsEntityOverview, recordedSignalsEntityRecords, recordedSignalsEntityRelationships, recordedSignalsFullResultsAuthorities, recordedSignalsFullResultsRecords, recordedSignalsFullResultsSuppliers,
  recordedSignalsMainScreen, recordedSignalsMethodology, recordedSignalsRecordPage,
} from "./recorded/signals.ts";
import { recordedEntityRecordsSidePanel, recordedEntityRelationships } from "./recorded/relationships.ts";
import { recordedFullResultsAuthorities, recordedFullResultsRecords, recordedFullResultsSuppliers, recordedMainScreen, recordedZoomedCounty } from "./recorded/index.ts";

export type { Fixture, FixtureKind, FixtureSet } from "./types.ts";
export { recordedEntityOverview } from "./recorded/entity.ts";
export { recordedEntityRecords } from "./recorded/records.ts";
export { recordedRecordPage } from "./recorded/record.ts";
export * from "./recorded/signals.ts";
export { recordedEntityRecordsSidePanel, recordedEntityRelationships } from "./recorded/relationships.ts";
export { recordedMainScreen, recordedFullResultsAuthorities, recordedFullResultsSuppliers, recordedFullResultsRecords, recordedZoomedCounty } from "./recorded/index.ts";

/**
 * Fixtures by operation name. A new operation must get a set here (the tests insist).
 * The main screen, zoomed-county and full-results operations are the API's recorded answers (`recorded/`), plus the few hand-written
 * states a recorded run cannot produce (pagination past 100 Records, estimated counts, every Record state at once).
 */
export const fixtures = {
  MainScreen: [...recordedMainScreen, ...recordedSignalsMainScreen, ...mainScreenHand],
  ZoomedCounty: recordedZoomedCounty,
  FullResultsAuthorities: [...recordedFullResultsAuthorities, ...recordedSignalsFullResultsAuthorities, ...fullResultsAuthoritiesHand],
  FullResultsSuppliers: [...recordedFullResultsSuppliers, ...recordedSignalsFullResultsSuppliers, ...fullResultsSuppliersHand],
  FullResultsRecords: [...recordedFullResultsRecords, ...recordedSignalsFullResultsRecords, ...fullResultsRecordsHand],
  EntityOverview: [...recordedEntityOverview, ...recordedSignalsEntityOverview, ...entityOverviewHand],
  EntityRecords: [...recordedEntityRecords, ...recordedEntityRecordsSidePanel, ...recordedSignalsEntityRecords, ...entityRecordsHand],
  EntityRelationships: [...recordedEntityRelationships, ...recordedSignalsEntityRelationships, ...entityRelationships],
  RecordPage: [...recordedRecordPage, ...recordedSignalsRecordPage, ...recordPageHand],
  CoverageLens: coverageLens,
  CoveragePage: coveragePage,
  MethodologyBaseRates: [...methodologyBaseRates, ...recordedSignalsMethodology],
} as const;

export type OperationName = keyof typeof fixtures;

/** Every fixture of one operation, to feed a story or a test. */
export const fixturesFor = <N extends OperationName>(name: N): (typeof fixtures)[N] => fixtures[name];

export type AnyFixture = Fixture<unknown, unknown>;
