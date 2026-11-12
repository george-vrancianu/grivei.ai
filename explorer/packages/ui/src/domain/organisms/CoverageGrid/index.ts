export { CoverageGrid, type CoverageGridProps } from "./CoverageGrid.tsx";
export { CoverageCell, type CoverageCellProps } from "./components/CoverageCell/index.ts";
export { CoverageGridLegend, type CoverageGridLegendProps } from "./components/CoverageGridLegend/index.ts";
export type { CoverageGridCopy, GridWindow } from "./coverageGrid.types.ts";
export {
  GAP_STATES, KIND_ORDER, RANGE_COLOR, STATE_COLORS, STATE_GLYPHS, cellName, crawlOnlyCells, explainedCells, formatCellCount, gridShape, kindLabel,
  kindsOf, quarterBounds, quarterInWindow, quarterSpan, reasonOf, stateSx, windowActive,
} from "./coverageGrid.utils.ts";
