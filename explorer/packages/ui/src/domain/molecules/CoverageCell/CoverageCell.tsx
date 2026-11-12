import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
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

/** The count as a short figure inside a cell: 18,400 -> "18k". */
const short = (n: number, locale: Locale) => new Intl.NumberFormat(locale === "ro" ? "ro" : "en-GB", { notation: "compact" }).format(n);

/** One cell of the grid: the state's colour, a glyph and border (the non-colour cues), the count, and the full accessible name. */
export function CoverageCell({ cell, quarter, kind, inRange, compact = false, locale, copy }: CoverageCellProps) {
  const size = compact ? 16 : 52;
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
        minWidth: size,
        width: size,
        height: compact ? 16 : 44,
        textAlign: "center",
        verticalAlign: "middle",
        fontSize: compact ? 10 : 12,
        lineHeight: 1.1,
        color: "#1a1a1a",
        ...(cell ? stateSx(cell.state) : { border: "1px solid #e0e0e0", color: "text.disabled" }),
        ...(inRange ? { boxShadow: `inset 0 0 0 2px ${RANGE_COLOR}` } : {}),
      }}
    >
      {cell ? (
        <Box component="span" aria-hidden sx={{ display: "block" }}>
          <span>{STATE_GLYPHS[cell.state]}</span>
          {!compact && cell.records > 0 && <Box component="span" sx={{ display: "block", fontSize: 11 }}>{short(cell.records, locale)}</Box>}
        </Box>
      ) : (
        <span aria-hidden>·</span>
      )}
    </TableCell>
  );
}
