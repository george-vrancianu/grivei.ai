import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { FIRST_YEAR } from "../../molecules/FilterChips/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { CountyCoverage, CoverageLens, CoverageStatus, SourceInfo } from "../../types.ts";
import type { CoverageSummaryParts } from "./coverageLensMap.types.ts";

/** The Source the county statuses are about (the lens asks for `coverage(source: SEAP)`). */
export const COVERAGE_SOURCE_ID = "SEAP";

/** Grey: not harvested. The fill of a not-harvested county and the outline of a planned Source's mark. */
export const PLANNED_MARK_COLOR = "#757575";

/** A county with no coverage row: a pale sand fill, visible against the white outlines and the page (never grey, which means not harvested). */
export const NO_STATUS_COLOR = "#e9dfc9";

/** The marks' look, shared by the map's marks and the legend's swatches. */
export const MARK_OUTLINE = "#1b2a41";
export const MARK_FILL = "#ffffff";
/** A harvested Source that is not the coverage Source: filled neutral dark, since the statuses describe only the coverage Source. */
export const OTHER_HARVESTED_MARK_COLOR = "#424242";

/**
 * One fill per status. Categorical, never a ratio scale. Grey means "not harvested" everywhere on this map (the glossary's rule), the
 * planned Sources' marks included; the other three stay apart for the common colour-blind types (dark blue / light blue / amber).
 * The legend and the accessible names carry the status words, so colour is never the only cue.
 */
export const COVERAGE_COLORS: Record<CoverageStatus, string> = {
  HARVESTED: "#1b5e8c",
  HARVESTED_WITH_KNOWN_GAPS: "#8cc0e0",
  PARTIAL: "#f0c75e",
  NOT_HARVESTED: PLANNED_MARK_COLOR,
};

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

/** "since" in a coverage sentence: the window's start as a date, else the first year of the data (`FIRST_YEAR`). */
export function sinceText(window: CoverageLens["coverage"]["window"], locale: Locale): string {
  return window.from ? formatDate(window.from, locale) : String(FIRST_YEAR);
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
