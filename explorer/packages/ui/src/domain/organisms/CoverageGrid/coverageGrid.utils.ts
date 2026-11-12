import type { Locale } from "../../../theme/index.ts";
import type { GapCellData, GapState } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import type { CoverageGridCopy, GridWindow } from "./coverageGrid.types.ts";

export const GAP_STATES: readonly GapState[] = ["LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"];

/** Each state's colour. Colour is never the only cue: every state also has a glyph and a border or pattern (`STATE_GLYPHS`, `stateSx`). */
export const STATE_COLORS: Record<GapState, string> = {
  LOADED: "#cde8d2",
  KNOWN_GAP: "#f4b9a8",
  POSSIBLY_INCOMPLETE: "#f7dc8a",
  NOT_IN_SOURCE: "#d9d9d9",
  CRAWLED_PROVISIONAL: "#c5dcf3",
  NOT_YET_LOADED: "#ffffff",
};

export const STATE_GLYPHS: Record<GapState, string> = {
  LOADED: "✓",
  KNOWN_GAP: "✕",
  POSSIBLY_INCOMPLETE: "?",
  NOT_IN_SOURCE: "–",
  CRAWLED_PROVISIONAL: "~",
  NOT_YET_LOADED: "…",
};

/** The colour of the date-range highlight (column header and cell outline). */
export const RANGE_COLOR = "#1565c0";

/** Colour plus a second cue per state: a hatch, a dashed or a dotted border. */
export function stateSx(state: GapState): Record<string, unknown> {
  const base = { backgroundColor: STATE_COLORS[state], border: "1px solid #9a9a9a" };
  switch (state) {
    case "NOT_IN_SOURCE":
      return { ...base, backgroundImage: "repeating-linear-gradient(45deg, #b5b5b5 0 2px, transparent 2px 6px)" };
    case "CRAWLED_PROVISIONAL":
      return { ...base, border: "1px dashed #3b6fa3" };
    case "NOT_YET_LOADED":
      return { ...base, border: "1px dotted #6b6b6b" };
    case "KNOWN_GAP":
      return { ...base, border: "1px solid #b04a2f" };
    default:
      return base;
  }
}

/** SEAP's record kinds in the order the Coverage page lists them; other Sources' kinds follow alphabetically. */
export const KIND_ORDER: readonly string[] = ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"];

const QUARTER = /^(\d{4})-Q([1-4])$/;

/** "2024-Q4" -> { year: 2024, q: 4 }; null when it is not a quarter. */
export function parseQuarter(quarter: string): { year: number; q: number } | null {
  const match = QUARTER.exec(quarter);
  return match ? { year: Number(match[1]), q: Number(match[2]) } : null;
}

/** First and last day of a quarter as ISO dates; null when the quarter is malformed. */
export function quarterBounds(quarter: string): { start: string; end: string } | null {
  const parsed = parseQuarter(quarter);
  if (!parsed) return null;
  const startMonth = (parsed.q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][endMonth - 1]!;
  return { start: `${parsed.year}-${pad(startMonth)}-01`, end: `${parsed.year}-${pad(endMonth)}-${lastDay}` };
}

/** True when a window restricts anything: at least one end is set. */
export function windowActive(window: GridWindow | null | undefined): window is GridWindow {
  return !!window && (!!window.from || !!window.to);
}

/** A quarter is in the window when it overlaps it; an open end reaches as far as the grid goes. No active window: nothing is highlighted. */
export function quarterInWindow(quarter: string, window: GridWindow | null | undefined): boolean {
  if (!windowActive(window)) return false;
  const bounds = quarterBounds(quarter);
  if (!bounds) return false;
  return (!window.from || bounds.end >= window.from) && (!window.to || bounds.start <= window.to);
}

/** Every quarter from the earliest to the latest in `quarters`, in order, none skipped. */
export function quarterSpan(quarters: readonly string[]): string[] {
  const parsed = quarters.map(parseQuarter).filter((q): q is { year: number; q: number } => q !== null);
  if (parsed.length === 0) return [];
  const index = (p: { year: number; q: number }) => p.year * 4 + (p.q - 1);
  const lo = Math.min(...parsed.map(index));
  const hi = Math.max(...parsed.map(index));
  return Array.from({ length: hi - lo + 1 }, (_, i) => `${Math.floor((lo + i) / 4)}-Q${((lo + i) % 4) + 1}`);
}

/** Record kinds present in the cells: the known SEAP ones in their order, then any others alphabetically. */
export function kindsOf(cells: readonly GapCellData[]): string[] {
  const present = [...new Set(cells.map((c) => c.kind))];
  const known = KIND_ORDER.filter((k) => present.includes(k));
  return [...known, ...present.filter((k) => !KIND_ORDER.includes(k)).sort()];
}

export const cellKey = (quarter: string, kind: string) => `${quarter}/${kind}`;

/** The grid's shape: its quarters (chronological, none skipped), its kinds and a lookup by quarter and kind. */
export function gridShape(cells: readonly GapCellData[]): { quarters: string[]; kinds: string[]; at: (quarter: string, kind: string) => GapCellData | undefined } {
  const byKey = new Map(cells.map((c) => [cellKey(c.quarter, c.kind), c]));
  return { quarters: quarterSpan(cells.map((c) => c.quarter)), kinds: kindsOf(cells), at: (quarter, kind) => byKey.get(cellKey(quarter, kind)) };
}

export const kindLabel = (kind: string, copy: Pick<CoverageGridCopy, "kinds">): string => copy.kinds[kind] ?? kind;

/**
 * Why a cell is in its state, in words: the hand-entered note verbatim (source data, never translated), else the rule's wording,
 * else nothing. A quarantined cell has neither, and that is the point: the quarantine is never exposed.
 */
export function reasonOf(cell: GapCellData, copy: Pick<CoverageGridCopy, "rules">): string | null {
  if (cell.note) return cell.note;
  return cell.rule ? copy.rules[cell.rule] : null;
}

/** The cell's accessible name: kind, quarter, state, then the Record count, the reason, crawl-only count, data-through and the range mark. */
export function cellName(cell: GapCellData, locale: Locale, copy: CoverageGridCopy, inRange = false): string {
  const parts = [`${kindLabel(cell.kind, copy)}, ${copy.quarterName(cell.quarter)}: ${copy.states[cell.state]}`];
  parts.push(copy.records(cell.records, formatCellCount(cell.records, locale)));
  const reason = reasonOf(cell, copy);
  if (reason) parts.push(reason);
  if (cell.crawlOnly) parts.push(copy.crawlOnly(cell.crawlOnly, formatCellCount(cell.crawlOnly, locale)));
  if (cell.dataThrough) parts.push(copy.dataThrough(formatDate(cell.dataThrough, locale, "long")));
  if (inRange) parts.push(copy.inRange);
  return parts.join(". ");
}

export const formatCellCount = (n: number, locale: Locale): string => new Intl.NumberFormat(locale === "ro" ? "ro" : "en-GB").format(n);

/** The cells that need an explanation: flagged states with a reason. Hand-entered gaps, possibly incomplete, not in the source, and not-yet-loaded cells that carry a rule. Ordered by quarter, then kind. */
export function explainedCells(cells: readonly GapCellData[]): GapCellData[] {
  const order = (kind: string) => (KIND_ORDER.includes(kind) ? KIND_ORDER.indexOf(kind) : KIND_ORDER.length);
  return cells
    .filter((c) => c.state === "KNOWN_GAP" || c.state === "POSSIBLY_INCOMPLETE" || c.state === "NOT_IN_SOURCE" || (c.state === "NOT_YET_LOADED" && c.rule !== null))
    .sort((a, b) => a.quarter.localeCompare(b.quarter) || order(a.kind) - order(b.kind) || a.kind.localeCompare(b.kind));
}

/** The cells that carry crawl-only Records, in the same order. */
export function crawlOnlyCells(cells: readonly GapCellData[]): GapCellData[] {
  return cells.filter((c) => (c.crawlOnly ?? 0) > 0).sort((a, b) => a.quarter.localeCompare(b.quarter) || a.kind.localeCompare(b.kind));
}
