import type { Locale } from "../../../theme/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import type { GapCellData } from "../../types.ts";
import type { CoverageGridCopy } from "../../utils/coverageGrid.types.ts";
import { RANGE_COLOR, STATE_GLYPHS, cellName, kindLabel, stateSx } from "../../utils/coverageGrid.ts";

export interface CoverageCellProps {
  /** Null: the grid has no cell for this quarter and kind. */
  cell: GapCellData | null;
  quarter: string;
  kind: string;
  inRange: boolean;
  /** Compact: a small square with no visible text (the accessible name and tooltip stay). */
  compact?: boolean;
  locale: Locale;
  copy: CoverageGridCopy;
}

/** One cell of the grid: the state's colour, a glyph and an outline or stripes (the non-colour cues), and the full accessible name (state, quarter, kind, count, reason). */
export function CoverageCell({ cell, quarter, kind, inRange, compact = false, locale, copy }: CoverageCellProps) {
  const name = cell
    ? cellName(cell, locale, copy, inRange)
    : `${kindLabel(kind, copy)}, ${copy.quarterName(quarter)}: ${copy.noCell}`;
  return (
    <TableCell
      aria-label={name}
      title={name}
      data-state={cell?.state ?? "none"}
      data-in-range={inRange ? "true" : undefined}
      sx={{
        p: 0,
        minWidth: compact ? 16 : 36,
        width: compact ? 16 : 36,
        height: compact ? 16 : 32,
        textAlign: "center",
        verticalAlign: "middle",
        typography: "meta",
        fontSize: compact ? 10 : 12,
        fontWeight: 600,
        lineHeight: 1,
        ...(cell ? stateSx(cell.state) : { border: 1, borderColor: "divider", color: "text.secondary" }),
        ...(inRange ? { boxShadow: `inset 0 0 0 2px ${RANGE_COLOR}` } : {}),
      }}
    >
      <span aria-hidden>{cell ? STATE_GLYPHS[cell.state] : "·"}</span>
    </TableCell>
  );
}
