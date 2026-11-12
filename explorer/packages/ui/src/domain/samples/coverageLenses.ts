// Invented Coverage lens data for the stories and tests, over the sample county outlines (`geo/counties.topo.ts`).
// Counties: Argeș, Brașov, Cluj, Constanța, Galați, Iași, Maramureș, Suceava, Timiș. Galați has no row (no status).
import type { CountyCoverage, CoverageLens, CoverageStatus, SourceInfo } from "../types.ts";

const county = (code: string, status: CoverageStatus, withRecords: number, publicEntities: number, otherAuthorities: number): CountyCoverage =>
  ({ county: code, status, withRecords, publicEntities, otherAuthorities });

/** SEAP is harvested; the later Sources are planned (their marks are greyed). Names are source data. */
export const sampleSources: SourceInfo[] = [
  { id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "CONTRACT", date: "2024-09-30" }] },
  { id: "ONRC", name: "ONRC", harvested: false, dataThrough: [] },
  { id: "ANI", name: "ANI", harvested: false, dataThrough: [] },
  { id: "MFINANTE", name: "Ministerul Finanțelor", harvested: false, dataThrough: [] },
  { id: "JUST", name: "portal.just.ro", harvested: false, dataThrough: [] },
];

const zeroTotal = { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false };

/** Every status once or more, National, and an Unplaced tally. Galați is absent (no status). */
export const typicalCoverage: CoverageLens = {
  sources: sampleSources,
  coverage: {
    window: { from: "2021-01-01", to: "2024-12-31" },
    counties: [
      county("RO-BV", "HARVESTED", 310, 340, 12),
      county("RO-IS", "HARVESTED", 255, 280, 8),
      county("RO-CJ", "HARVESTED_WITH_KNOWN_GAPS", 400, 480, 20),
      county("RO-SV", "HARVESTED_WITH_KNOWN_GAPS", 190, 230, 1),
      county("RO-TM", "PARTIAL", 150, 520, 9),
      county("RO-AG", "PARTIAL", 90, 300, 0),
      county("RO-MM", "NOT_HARVESTED", 0, 130, 0),
      county("RO-CT", "NOT_HARVESTED", 0, 210, 3),
      county("NATIONAL", "HARVESTED", 12_450, 13_200, 480),
    ],
    unplacedAuthorities: { authorities: 17, total: { awarded: "1200000000", records: 130, suspectLeftOut: 2, noValue: 0, frameworkCeilings: "0", estimated: false } },
  },
};

/** The window starts at no date: "since" falls back to the harvest's first year. */
export const openWindowCoverage: CoverageLens = { ...typicalCoverage, coverage: { ...typicalCoverage.coverage, window: { from: null, to: null } } };

/** A window before the harvest: every county not harvested, nothing unplaced. */
export const nothingHarvestedCoverage: CoverageLens = {
  sources: sampleSources,
  coverage: {
    window: { from: "2019-01-01", to: "2019-12-31" },
    counties: typicalCoverage.coverage.counties.map((row) => ({ ...row, status: "NOT_HARVESTED" as const, withRecords: 0, otherAuthorities: 0 })),
    unplacedAuthorities: { authorities: 0, total: zeroTotal },
  },
};
