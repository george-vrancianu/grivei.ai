// Mock fixtures: one set per persisted operation, hand-written, typed by the generated operation types
// and validated against the schema and the operation in CI (fixtures.test.ts).
import type { Fixture } from "./types.ts";
import { coverageLens, coveragePage } from "./coverage.ts";
import { entityOverview, entityRecords, entityRelationships } from "./entity.ts";
import { fullResultsAuthorities, fullResultsRecords, fullResultsSuppliers } from "./full-results.ts";
import { mainScreen, zoomedCounty } from "./main-screen.ts";
import { methodologyBaseRates } from "./methodology.ts";
import { recordPage } from "./record-page.ts";

export type { Fixture, FixtureKind, FixtureSet } from "./types.ts";

/** Fixtures by operation name. A new operation must get a set here (the tests insist). */
export const fixtures = {
  MainScreen: mainScreen,
  ZoomedCounty: zoomedCounty,
  FullResultsAuthorities: fullResultsAuthorities,
  FullResultsSuppliers: fullResultsSuppliers,
  FullResultsRecords: fullResultsRecords,
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
