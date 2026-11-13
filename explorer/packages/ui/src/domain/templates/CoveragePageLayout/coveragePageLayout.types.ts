import type { DataThroughDateCopy } from "../../atoms/DataThroughDate/index.ts";
import type { CoverageGridCopy, GridWindow } from "../../organisms/CoverageGrid/index.ts";
import type { GapCellData, GapRule, GapState, SourceInfo } from "../../types.ts";

/** What the Coverage page shows, from `CoveragePage` (grid and `sources`); `crawlOnly` on a cell is the UI-side extension (see `GapCellData`). */
export interface CoveragePageContent {
  /** The Source's grid. */
  cells: readonly GapCellData[];
  /** `sources`: the harvested ones list their data-through per record kind. */
  sources: readonly SourceInfo[];
  /** MF Lista entităților publice snapshot date (YYYY-MM-DD); null when no list is loaded yet. */
  referenceSnapshot: string | null;
  /** The date chip's window: the grid's quarters that overlap it are highlighted. The grid itself is the whole harvest, not cut to the window. */
  dateWindow?: GridWindow | null;
}

export interface CoveragePageLayoutCopy {
  /** The mono amber line above the title. */
  eyebrow: string;
  title: string;
  intro: string;
  grid: CoverageGridCopy;
  gridHeading: string;
  dataThrough: { heading: string; intro: string; none: string; copy: DataThroughDateCopy };
  crawlOnly: { heading: string; intro: string; line: (kind: string, quarter: string, n: number, formatted: string) => string };
  knownGaps: {
    heading: string;
    intro: string;
    empty: string;
    columns: { quarter: string; kind: string; state: string; reason: string; records: string };
  };
  rules: {
    heading: string;
    intro: string;
    /** The rule's short name, by rule. */
    names: Record<GapRule, string>;
    statesHeading: string;
    /** What each state means, in words. */
    states: Record<GapState, string>;
    /** Link text to the methodology page. */
    methodology: string;
  };
  /** The "N of M" block: what a county reads on the map's Coverage lens. */
  perCounty: { heading: string; body: string; lensLink: string };
  snapshot: { heading: string; line: (date: string) => string; notLoaded: string };
  /** The window holds no quarter of the Source. */
  empty: string;
  loading: string;
  error: string;
}
