import type { CoverageStatus } from "../../types.ts";
import type { BaseMapCopy } from "../BaseMap/index.ts";
import type { OffMapTilesCopy } from "../MoneyLensMap/index.ts";

/** The numbers and words a coverage sentence is built from. Counts come with their locale-formatted text. */
export type CoverageSummaryParts = {
  withRecords: number;
  withRecordsText: string;
  publicEntities: number;
  publicEntitiesText: string;
  otherAuthorities: number;
  otherAuthoritiesText: string;
  /** The Source's name as published ("SEAP"). */
  source: string;
  /** The start of the window, as a formatted date, or the harvest's first year when the window is open. */
  since: string;
};

export type SourceMarksCopy = {
  /** Heading of the marks' explanation in the legend, e.g. "One mark per Source". */
  title: string;
  /** What a harvested Source's mark shows, from its name: "SEAP: coloured by the county's status". */
  harvested: (source: string) => string;
  /** The label of a planned Source's mark, from its name: "ONRC: not harvested". */
  notHarvested: (source: string) => string;
  /** The legend line for the planned Sources' greyed marks, from their names. */
  plannedLegend: (sources: string) => string;
};

export type CoverageTooltipCopy = {
  /** "340 of 480 public entities have SEAP records since 1 Jan 2021, plus 12 other contracting authorities". */
  summary: (parts: CoverageSummaryParts) => string;
  /** An entity without records may simply have bought nothing: coverage is not a gap count. */
  boughtNothingNote: string;
};

/** Every user-facing string of the Coverage lens map. The app passes its catalogue; stories pass sample copy. */
export type CoverageLensMapCopy = {
  /** The base map's strings; `legendTitle` names the measure ("Coverage"); `noData` is unused (see `noStatus`). */
  map: BaseMapCopy;
  /** The status words, one per status. */
  status: Record<CoverageStatus, string>;
  /** A county the coverage lacks a row for: not "not harvested", and not "bought nothing". */
  noStatus: string;
  /** The caption shown when every county shares one status, from the coverage Source's name: "SEAP is harvested nationally; gaps apply to every county". */
  nationalCaption: (source: string) => string;
  marks: SourceMarksCopy;
  tooltip: CoverageTooltipCopy;
  /** The tiles' strings: the Money lens's, so a page can share them. */
  tiles: Pick<OffMapTilesCopy, "heading" | "national" | "unplaced" | "unplacedAuthorities" | "records" | "suspectLeftOut">;
};

