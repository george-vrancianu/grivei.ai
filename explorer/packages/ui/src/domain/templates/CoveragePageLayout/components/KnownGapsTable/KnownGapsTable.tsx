import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { TableBody } from "../../../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { PanelTable } from "../../../../molecules/PanelTable/index.ts";
import { NumericCell } from "../../../../atoms/NumericCell/index.ts";
import { TableHead } from "../../../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapCellData } from "../../../../types.ts";
import { formatCellCount, kindLabel, reasonOf, stateSx } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface KnownGapsTableProps {
  /** The cells to list (`explainedCells`). */
  cells: readonly GapCellData[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/**
 * The body of the Known gaps panel (flush): the intro, padded, then a `PanelTable` of quarter, record kind, state, reason or rule and Record count; each state shows its cell colour as a swatch (no glyph: the name is the cue).
 * The table keeps the heading as its name; its scroll region has the copy's `tableLabel`, so the panel is the only region named "Known gaps".
 */
export function KnownGapsTable({ cells, locale, copy }: KnownGapsTableProps) {
  const { knownGaps, grid } = copy;
  return (
    <>
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>{knownGaps.intro}</Typography>
        {cells.length === 0 && <Typography sx={{ mt: 1.5 }}>{knownGaps.empty}</Typography>}
      </Box>
      {cells.length > 0 && (
        <PanelTable label={knownGaps.tableLabel} aria-label={knownGaps.heading} size="small" minWidth={640}>
            <TableHead>
              <TableRow>
                <TableCell>{knownGaps.columns.quarter}</TableCell>
                <TableCell>{knownGaps.columns.kind}</TableCell>
                <TableCell>{knownGaps.columns.state}</TableCell>
                <TableCell>{knownGaps.columns.reason}</TableCell>
                <NumericCell>{knownGaps.columns.records}</NumericCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cells.map((cell) => (
                <TableRow key={`${cell.quarter}/${cell.kind}`} data-state={cell.state}>
                  <TableCell>{grid.quarterName(cell.quarter)}</TableCell>
                  <TableCell>{kindLabel(cell.kind, grid)}</TableCell>
                  <TableCell>
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                      <Box component="span" aria-hidden data-swatch={cell.state} sx={{ ...stateSx(cell.state), width: 12, height: 12, flex: "none" }} />
                      {grid.states[cell.state]}
                    </Box>
                  </TableCell>
                  <TableCell>{reasonOf(cell, grid)}</TableCell>
                  <NumericCell>{formatCellCount(cell.records, locale)}</NumericCell>
                </TableRow>
              ))}
            </TableBody>
        </PanelTable>
      )}
    </>
  );
}
