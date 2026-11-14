import type { Locale } from "../../theme/index.ts";
import { color, coverage, radius } from "../../theme/tokens.ts";
import type { GapCellData, GapState } from "../types.ts";
import { formatCount } from "../atoms/ApproxCount/index.ts";
import { formatDate } from "./formatDate.ts";
import type { CoverageGridCopy, GridWindow } from "./coverageGrid.types.ts";

export const GAP_STATES: readonly GapState[] = ["LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"];

export const STATE_GLYPHS: Record<GapState, string> = {
  LOADED: "✓",
  KNOWN_GAP: "✕",
  POSSIBLY_INCOMPLETE: "?",
  NOT_IN_SOURCE: "–",
  CRAWLED_PROVISIONAL: "c",
  NOT_YET_LOADED: "…",
};

/** The date-range highlight (column header and cell outline): the body text colour, which shows on amber and on the dark ground alike. */
export const RANGE_COLOR = color.text;

/**
 * Each state's look on the dark ground: amber fill (loaded), stripes (known gap), a dimmer amber (possibly incomplete), an amber outline
 * (crawled, provisional), a quiet fill (awaiting the bulk file) and a bare outline (not in the source). Colour is never the only cue: every
 * state also has its glyph (`STATE_GLYPHS`) and its accessible name.
 */
export function stateSx(state: GapState): Record<string, unknown> {
  const base = { borderRadius: `${radius.cell}px`, borderWidth: 1, borderStyle: "solid" };
  switch (state) {
    case "LOADED":
      return { ...base, backgroundColor: coverage.harvested, borderColor: coverage.harvested, color: color.onAccent };
    case "KNOWN_GAP":
      return {
        ...base,
        backgroundImage: `repeating-linear-gradient(135deg, ${coverage.knownGapStripeA} 0 3px, ${coverage.knownGapStripeB} 3px 6px)`,
        borderColor: coverage.knownGapStripeA,
        color: color.text,
        textShadow: `0 0 3px ${color.bg}, 0 0 3px ${color.bg}`,
      };
    case "POSSIBLY_INCOMPLETE":
      return { ...base, backgroundColor: coverage.possiblyIncomplete, borderColor: coverage.possiblyIncomplete, color: color.onAccent };
    case "CRAWLED_PROVISIONAL":
      return { ...base, backgroundColor: "transparent", borderColor: color.accent, color: color.accent };
    case "NOT_YET_LOADED":
      return { ...base, backgroundColor: coverage.awaitingBulkFile, borderColor: coverage.awaitingBulkFile, color: color.muted };
    case "NOT_IN_SOURCE":
      return { ...base, backgroundColor: "transparent", borderColor: color.lineStrong, color: color.muted };
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

/** The header's year labels: consecutive quarters of one year share one label (`span` columns); a name that is not a quarter stands alone. */
export function yearGroups(quarters: readonly string[]): { label: string; span: number }[] {
  const groups: { label: string; span: number }[] = [];
  for (const quarter of quarters) {
    const parsed = parseQuarter(quarter);
    const label = parsed ? String(parsed.year) : quarter;
    const last = groups[groups.length - 1];
    if (parsed && last?.label === label) last.span += 1;
    else groups.push({ label, span: 1 });
  }
  return groups;
}

/** First and last day of a quarter as ISO dates; null when the quarter is malformed. */
export function quarterBounds(quarter: string): { start: string; end: string } | null {
  const parsed = parseQuarter(quarter);
  if (!parsed) return null;
  const startMonth = (parsed.q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = [31, 30, 30, 31][parsed.q - 1]!; // Mar, Jun, Sep, Dec
  return { start: `${parsed.year}-${pad(startMonth)}-01`, end: `${parsed.year}-${pad(endMonth)}-${lastDay}` };
}

/** True when a window restricts anything: at least one end is set. */
export function windowActive(dateWindow: GridWindow | null | undefined): dateWindow is GridWindow {
  return !!dateWindow && (!!dateWindow.from || !!dateWindow.to);
}

/** A quarter is in the window when it overlaps it; an open end reaches as far as the grid goes. No active window: nothing is highlighted. */
export function quarterInWindow(quarter: string, dateWindow: GridWindow | null | undefined): boolean {
  if (!windowActive(dateWindow)) return false;
  const bounds = quarterBounds(quarter);
  if (!bounds) return false;
  return (!dateWindow.from || bounds.end >= dateWindow.from) && (!dateWindow.to || bounds.start <= dateWindow.to);
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

/** The year of the earliest quarter in the cells; null when there is none. */
export function firstYearOf(cells: readonly GapCellData[]): number | null {
  const years = cells.map((c) => parseQuarter(c.quarter)?.year).filter((y): y is number => y !== undefined);
  return years.length === 0 ? null : Math.min(...years);
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
 * Why a cell is in its state, in words: the hand-entered note verbatim (source data, never translated), else one fixed sentence for every
 * Not yet loaded cell, else the rule's wording, else nothing. A Not yet loaded cell reads the same whatever its rule: a file not published yet
 * and a file set aside must be indistinguishable (the quarantine is never exposed).
 */
export function reasonOf(cell: GapCellData, copy: Pick<CoverageGridCopy, "rules" | "notYetLoaded">): string | null {
  if (cell.note) return cell.note;
  if (cell.state === "NOT_YET_LOADED") return copy.notYetLoaded;
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

/** A Record count as a whole number in the reader's language. */
export const formatCellCount = (n: number, locale: Locale): string => formatCount(n, false, locale);

/** Quarter, then record kind (SEAP's order first), the order the page lists cells in. */
function byQuarterThenKind(a: GapCellData, b: GapCellData): number {
  const order = (kind: string) => (KIND_ORDER.includes(kind) ? KIND_ORDER.indexOf(kind) : KIND_ORDER.length);
  return a.quarter.localeCompare(b.quarter) || order(a.kind) - order(b.kind) || a.kind.localeCompare(b.kind);
}

/**
 * The cells that need an explanation: hand-entered gaps, possibly incomplete, and not in the source, each with its reason or rule.
 * A Not yet loaded cell is never listed, whatever its rule, so a set-aside file cannot be told from a file not yet published.
 */
export function explainedCells(cells: readonly GapCellData[]): GapCellData[] {
  return cells.filter((c) => c.state === "KNOWN_GAP" || c.state === "POSSIBLY_INCOMPLETE" || c.state === "NOT_IN_SOURCE").sort(byQuarterThenKind);
}

/** The cells that carry crawl-only Records, in the same order. */
export function crawlOnlyCells(cells: readonly GapCellData[]): GapCellData[] {
  return cells.filter((c) => c.crawlOnly > 0).sort(byQuarterThenKind);
}
