import type { Locale } from "../../../../../theme/index.ts";
import { Table } from "../../../../../atoms/Table/index.ts";
import { TableBody } from "../../../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../../../atoms/TableRow/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapCellData } from "../../../../types.ts";
import { formatCellCount, kindLabel, reasonOf } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface KnownGapsTableProps {
  /** The cells to list (`explainedCells`). */
  cells: readonly GapCellData[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** The known gaps: quarter, record kind, state, reason or rule, Record count. */
export function KnownGapsTable({ cells, locale, copy }: KnownGapsTableProps) {
  const { knownGaps, grid } = copy;
  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>{knownGaps.intro}</Typography>
      {cells.length === 0 ? (
        <Typography>{knownGaps.empty}</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label={knownGaps.heading}>
            <TableHead>
              <TableRow>
                <TableCell>{knownGaps.columns.quarter}</TableCell>
                <TableCell>{knownGaps.columns.kind}</TableCell>
                <TableCell>{knownGaps.columns.state}</TableCell>
                <TableCell>{knownGaps.columns.reason}</TableCell>
                <TableCell align="right">{knownGaps.columns.records}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cells.map((cell) => (
                <TableRow key={`${cell.quarter}/${cell.kind}`} data-state={cell.state}>
                  <TableCell>{grid.quarterName(cell.quarter)}</TableCell>
                  <TableCell>{kindLabel(cell.kind, grid)}</TableCell>
                  <TableCell>{grid.states[cell.state]}</TableCell>
                  <TableCell>{reasonOf(cell, grid)}</TableCell>
                  <TableCell align="right">{formatCellCount(cell.records, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
