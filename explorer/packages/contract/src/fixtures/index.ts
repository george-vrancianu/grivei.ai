// Mock fixtures: one set per persisted operation, hand-written, typed by the generated operation types
// and validated against the schema and the operation in CI (fixtures.test.ts).
import type { Fixture } from "./types.ts";
import { coverageLens, coveragePage } from "./coverage.ts";
import { entityOverview, entityRecords, entityRelationships } from "./entity.ts";
import { fullResultsAuthoritiesHand, fullResultsRecordsHand, fullResultsSuppliersHand } from "./full-results.ts";
import { mainScreenHand } from "./main-screen.ts";
import { methodologyBaseRates } from "./methodology.ts";
import { recordPage } from "./record-page.ts";
import { recordedFullResultsAuthorities, recordedFullResultsRecords, recordedFullResultsSuppliers, recordedMainScreen, recordedZoomedCounty } from "./recorded/index.ts";

export type { Fixture, FixtureKind, FixtureSet } from "./types.ts";
export { recordedMainScreen, recordedFullResultsAuthorities, recordedFullResultsSuppliers, recordedFullResultsRecords, recordedZoomedCounty } from "./recorded/index.ts";

/**
 * Fixtures by operation name. A new operation must get a set here (the tests insist).
 * The main screen, zoomed-county and full-results operations are the API's recorded answers (`recorded/`), plus the few hand-written
 * states a recorded run cannot produce (pagination past 100 Records, estimated counts, every Record state at once).
 */
export const fixtures = {
  MainScreen: [...recordedMainScreen, ...mainScreenHand],
  ZoomedCounty: recordedZoomedCounty,
  FullResultsAuthorities: [...recordedFullResultsAuthorities, ...fullResultsAuthoritiesHand],
  FullResultsSuppliers: [...recordedFullResultsSuppliers, ...fullResultsSuppliersHand],
  FullResultsRecords: [...recordedFullResultsRecords, ...fullResultsRecordsHand],
  EntityOverview: entityOverview,
  EntityRecords: entityRecords,
  EntityRelationships: entityRelationships,
  RecordPage: recordPage,
  CoverageLens: coverageLens,
  CoveragePage: coveragePage,
  MethodologyBaseRates: methodologyBaseRates,
} as const;

export type OperationName = keyof typeof fixtures;

/** Every fixture of one operation, to feed a story or a test. */
export const fixturesFor = <N extends OperationName>(name: N): (typeof fixtures)[N] => fixtures[name];

export type AnyFixture = Fixture<unknown, unknown>;
