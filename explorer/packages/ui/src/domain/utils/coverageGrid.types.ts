import type { GapRule, GapState } from "../types.ts";

/** A date window as the date chip gives it: either end can be open (null or absent). */
export interface GridWindow {
  from?: string | null;
  to?: string | null;
}

/** Words for the Coverage grid, in one language. Kinds are each Source's own vocabulary (ADR 0005): `kinds` is a lookup with the raw kind as the fallback. */
export interface CoverageGridCopy {
  /** The grid's accessible name. */
  label: string;
  /** The corner cell above the kind labels. */
  kindHeader: string;
  /** "2024-Q4" as a name ("Q4 2024"). */
  quarterName: (quarter: string) => string;
  kinds: Partial<Record<string, string>>;
  states: Record<GapState, string>;
  /** Each published rule in words; the possibly-incomplete rule exactly as published. */
  rules: Record<GapRule, string>;
  /** Why a Not yet loaded cell is that: one sentence for every such cell, whatever its rule (a quarantined file reads the same as a file not published yet). */
  notYetLoaded: string;
  /** A quarter and kind the grid has no cell for. */
  noCell: string;
  records: (n: number, formatted: string) => string;
  crawlOnly: (n: number, formatted: string) => string;
  /** "data through 30 September 2024", given the formatted date. */
  dataThrough: (date: string) => string;
  /** The column is inside the active date range. */
  inRange: string;
  legend: { title: string; range: string };
  /** Compact variant only: the link to the Coverage page. */
  seePage: string;
}
