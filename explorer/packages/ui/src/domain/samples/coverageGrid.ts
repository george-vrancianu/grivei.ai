// Invented Coverage grids for the stories and tests: SEAP, 2021-Q1 to the current quarter 2025-Q3 (the rebuild of 2025-09-20),
// four record kinds. Counts are invented. The shapes follow the pipeline's rules (watchdog/README.md, "Coverage grid").
import { fixtures } from "@grivei/contract/fixtures";
import type { CoveragePageContent } from "../templates/CoveragePageLayout/index.ts";
import type { GapCellData, GapState, SourceInfo } from "../types.ts";
import type { GridWindow } from "../organisms/CoverageGrid/index.ts";
import { quarterSpan } from "../utils/coverageGrid.ts";
import { sampleSources } from "./coverageLenses.ts";

export const KINDS = ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"] as const;
export const CURRENT_QUARTER = "2025-Q3";
/** The hand-entered gap's written reason: source data, in Romanian in both languages. */
export const HAND_ENTERED_NOTE = "Fișierul ADR pentru T2 2025 a fost republicat fără achizițiile directe notificate; completat manual din arhiva furnizorului";

const cell = (quarter: string, kind: string, state: GapState, records: number, o: Partial<GapCellData> = {}): GapCellData => ({
  quarter, kind, state, rule: null, note: null, records, dataThrough: null, ...o,
});

const base = (kind: string, quarter: string): number => ({ DA: 41_000, DAN: 9_200, CONTRACT: 17_500, AWARD_NOTICE: 6_400 })[kind]! + (quarter.charCodeAt(3)! % 7) * 130;
const endOf = (quarter: string) => ({ Q1: "03-31", Q2: "06-30", Q3: "09-30", Q4: "12-31" })[quarter.slice(5) as "Q1"];

export interface SampleGridOptions {
  /** After the 2021-22 backfill: the award notices without a prior call are covered via e-licitatie (LOADED), not "not in source". */
  backfilled?: boolean;
}

/** Every state occurs: loaded, the 2021-22 award notices not in the source, the Q2 2025 DAN hand-entered gap, 2024-Q4 CONTRACT possibly incomplete, a quarantined DA quarter (not yet loaded, no reason), the current quarter crawled provisional and awaiting the bulk file. */
export function sampleGrid({ backfilled = false }: SampleGridOptions = {}): GapCellData[] {
  return quarterSpan(["2021-Q1", CURRENT_QUARTER]).flatMap((quarter) =>
    KINDS.map((kind): GapCellData => {
      const year = Number(quarter.slice(0, 4));
      const records = base(kind, quarter);
      const through = endOf(quarter);
      if (quarter === CURRENT_QUARTER) {
        if (kind === "DA" || kind === "DAN") return cell(quarter, kind, "NOT_YET_LOADED", 0, { rule: "AWAITING_BULK_FILE" });
        return cell(quarter, kind, "CRAWLED_PROVISIONAL", kind === "CONTRACT" ? 3_100 : 2_050, { rule: "AWAITING_BULK_FILE", dataThrough: "2025-09-19", crawlOnly: kind === "CONTRACT" ? 140 : 35 });
      }
      if (kind === "AWARD_NOTICE" && year <= 2022) {
        return backfilled
          ? cell(quarter, kind, "LOADED", Math.round(records / 3), { dataThrough: `${year}-${through}` })
          : cell(quarter, kind, "NOT_IN_SOURCE", 0, { rule: "NO_PRIOR_CALL_BEFORE_BACKFILL" });
      }
      if (quarter === "2025-Q2" && kind === "DAN") return cell(quarter, kind, "KNOWN_GAP", 0, { rule: "HAND_ENTERED", note: HAND_ENTERED_NOTE });
      if (quarter === "2024-Q4" && kind === "CONTRACT") return cell(quarter, kind, "POSSIBLY_INCOMPLETE", 6_900, { rule: "COUNT_BELOW_NEIGHBOURS", dataThrough: "2024-12-31" });
      if (quarter === "2023-Q3" && kind === "DA") return cell(quarter, kind, "NOT_YET_LOADED", 0);
      return cell(quarter, kind, "LOADED", records, { dataThrough: `${year}-${through}` });
    }),
  );
}

/** The SEAP source with a data-through per record kind (the current quarter's bulk files are not published: the crawl runs further than the bulk). */
export const sampleSeap: SourceInfo[] = [
  { ...sampleSources[0]!, dataThrough: [{ kind: "DA", date: "2025-06-30" }, { kind: "DAN", date: "2025-03-31" }, { kind: "CONTRACT", date: "2025-09-19" }, { kind: "AWARD_NOTICE", date: "2025-09-19" }] },
  ...sampleSources.slice(1),
];

/** A whole page's content from the sample grid. */
export function samplePageContent(dateWindow: GridWindow = { from: "2023-01-01", to: "2024-12-31" }, options: SampleGridOptions = {}): CoveragePageContent {
  return { cells: sampleGrid(options), sources: sampleSeap, referenceSnapshot: "2025-08-14", dateWindow };
}

/** A Coverage page fixture of the contract as page content (`CoveragePage`: typical-every-gap-state, whole-grid, extreme-full-grid, empty-window). */
export function fixturePageContent(name: string): CoveragePageContent {
  const found = fixtures.CoveragePage.find((f) => f.name === name);
  if (!found) throw new Error(`No CoveragePage fixture named ${name}`);
  const { coverage, sources } = found.data;
  return { cells: coverage.grid, sources, referenceSnapshot: coverage.referenceSnapshot, dateWindow: coverage.window };
}

/** The cells of the quarters from `from` to `to` (inclusive, "2024-Q1"), for stories that zoom on a stretch of the grid. */
export const cellsBetween = (cells: readonly GapCellData[], from: string, to: string): GapCellData[] => cells.filter((c) => c.quarter >= from && c.quarter <= to);
