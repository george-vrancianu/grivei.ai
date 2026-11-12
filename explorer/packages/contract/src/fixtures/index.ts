// Mock fixtures: one set per persisted operation (hand-written, or recorded from seam 1 where recorded/ has the operation), typed by the generated operation types
// and validated against the schema and the operation in CI (fixtures.test.ts).
import type { Fixture } from "./types.ts";
import { coverageLens, coveragePage } from "./coverage.ts";
import { entityOverviewHand, entityRecords, entityRelationships } from "./entity.ts";
import { fullResultsAuthorities, fullResultsRecords, fullResultsSuppliers } from "./full-results.ts";
import { mainScreen, zoomedCounty } from "./main-screen.ts";
import { methodologyBaseRates } from "./methodology.ts";
import { recordPage } from "./record-page.ts";
import { recordedEntityOverview } from "./recorded/entity.ts";

export type { Fixture, FixtureKind, FixtureSet } from "./types.ts";
export { recordedEntityOverview } from "./recorded/entity.ts";

/** Fixtures by operation name. A new operation must get a set here (the tests insist). */
export const fixtures = {
  MainScreen: mainScreen,
  ZoomedCounty: zoomedCounty,
  FullResultsAuthorities: fullResultsAuthorities,
  FullResultsSuppliers: fullResultsSuppliers,
  FullResultsRecords: fullResultsRecords,
  EntityOverview: [...recordedEntityOverview, ...entityOverviewHand],
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
