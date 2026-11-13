import type { Locale } from "../../../theme/index.ts";
import { color, map } from "../../../theme/tokens.ts";
import { ADJUSTED_BLUE } from "../BaseMap/baseMap.utils.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { FIRST_YEAR } from "../../molecules/FilterChips/index.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { CountyCoverage, CoverageLens, CoverageStatus, SourceInfo } from "../../types.ts";
import type { CoverageSummaryParts } from "./coverageLensMap.types.ts";

/** The Source the county statuses are about (the lens asks for `coverage(source: SEAP)`). */
export const COVERAGE_SOURCE_ID = "SEAP";

/** Grey: not harvested. The fill of a not-harvested county and the outline of a planned Source's mark. */
export const PLANNED_MARK_COLOR = "#757575";

/** A county with no coverage row: the dark ground's "none" fill (a dark slate, never the mid grey that means not harvested). Its swatch carries an outline (`NONE_OUTLINE`). */
export const NO_STATUS_COLOR = map.none;

/** The marks' look, shared by the map's marks and the legend's swatches: a dark outline that reads on every status fill, and the panel colour inside a planned Source's hollow mark. */
export const MARK_OUTLINE = color.bg;
export const MARK_FILL = color.panel;
/** A harvested Source that is not the coverage Source: filled neutral light (it must read on the dark ground), since the statuses describe only the coverage Source. */
export const OTHER_HARVESTED_MARK_COLOR = color.text2;

/**
 * One fill per status. Categorical, never a ratio scale. Grey means "not harvested" everywhere on this map (the glossary's rule), the
 * planned Sources' marks included; the other three stay apart for the common colour-blind types (dark blue / light blue / amber).
 * The legend and the accessible names carry the status words, so colour is never the only cue.
 */
export const COVERAGE_COLORS: Record<CoverageStatus, string> = {
  HARVESTED: ADJUSTED_BLUE,
  HARVESTED_WITH_KNOWN_GAPS: "#8cc0e0",
  PARTIAL: "#f0c75e",
  NOT_HARVESTED: PLANNED_MARK_COLOR,
};

/**
 * The Coverage lens's caption condition: the one status every county of the map shares, or null when the counties differ, when any county
 * has no row (it is drawn "no coverage status", so "every county" would be false) or when the map has none. Only the map's own counties
 * count: `NATIONAL` and other off-map rows are not counties. Derived from the data, so a Source harvested per county loses the caption by itself.
 */
export function sharedCountyStatus(rows: ReadonlyMap<string, CountyCoverage>, countyCodes: readonly string[]): CoverageStatus | null {
  const statuses = new Set<CoverageStatus>();
  for (const code of countyCodes) {
    const row = rows.get(code);
    if (!row) return null;
    statuses.add(row.status);
  }
  return statuses.size === 1 ? ([...statuses][0] ?? null) : null;
}

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
