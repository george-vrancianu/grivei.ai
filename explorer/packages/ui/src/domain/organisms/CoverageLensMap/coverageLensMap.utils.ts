import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { CountyCoverage, CoverageLens, CoverageStatus, SourceInfo } from "../../types.ts";
import type { CoverageSummaryParts } from "./coverageLensMap.types.ts";

/** The year SEAP bulk data starts: what "since" says when the date window has no start. */
export const HARVEST_START_YEAR = 2021;

/** The Source the county statuses are about (the lens asks for `coverage(source: SEAP)`). */
export const COVERAGE_SOURCE_ID = "SEAP";

/**
 * One fill per status. Categorical, never a ratio scale. Chosen to stay apart for the common colour-blind types
 * (dark blue / light blue / amber / vermilion, after Okabe and Ito) and from the grey no-status fill; the legend and the
 * accessible names carry the status words, so colour is never the only cue.
 */
export const COVERAGE_COLORS: Record<CoverageStatus, string> = {
  HARVESTED: "#1b5e8c",
  HARVESTED_WITH_KNOWN_GAPS: "#8cc0e0",
  PARTIAL: "#f0c75e",
  NOT_HARVESTED: "#d55e00",
};

/** The planned Sources' marks: grey, outlined, empty. */
export const PLANNED_MARK_COLOR = "#757575";

/** Every status, in the legend's order (most to least covered). */
export const COVERAGE_STATUSES: readonly CoverageStatus[] = ["HARVESTED", "HARVESTED_WITH_KNOWN_GAPS", "PARTIAL", "NOT_HARVESTED"];

/** Each area's coverage row by code (counties and NATIONAL). */
export function coverageByCounty(lens: Pick<CoverageLens["coverage"], "counties">): ReadonlyMap<string, CountyCoverage> {
  return new Map(lens.counties.map((row) => [row.county, row]));
}

/** The Sources that are not harvested yet, in the order the contract lists them. */
export function plannedSources(sources: readonly SourceInfo[]): SourceInfo[] {
  return sources.filter((source) => !source.harvested);
}

/** The Source the statuses describe, by id; undefined when the list lacks it. */
export function coverageSource(sources: readonly SourceInfo[]): SourceInfo | undefined {
  return sources.find((source) => source.id === COVERAGE_SOURCE_ID);
}

/** "since" in a coverage sentence: the window's start as a date, else the harvest's first year. */
export function sinceText(window: CoverageLens["coverage"]["window"], locale: Locale): string {
  return window.from ? formatDate(window.from, locale) : String(HARVEST_START_YEAR);
}

/** The parts of a county's coverage sentence, counts formatted for the locale. */
export function summaryParts(row: CountyCoverage, source: string, since: string, locale: Locale): CoverageSummaryParts {
  return {
    withRecords: row.withRecords,
    withRecordsText: formatCount(row.withRecords, false, locale),
    publicEntities: row.publicEntities,
    publicEntitiesText: formatCount(row.publicEntities, false, locale),
    otherAuthorities: row.otherAuthorities,
    otherAuthoritiesText: formatCount(row.otherAuthorities, false, locale),
    source,
    since,
  };
}
