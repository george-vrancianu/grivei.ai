import { Stack } from "../../../atoms/Stack/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { DataThroughDate, type DataThroughDateCopy } from "../../atoms/DataThroughDate/index.ts";
import type { DataThrough, GapState, SnapshotCellData } from "../../types.ts";
import { formatCellCount } from "../../utils/coverageGrid.ts";
import { formatDate, formatMonth } from "../../utils/formatDate.ts";

export interface SnapshotCoverageCopy {
  /** The accessible name of the table. */
  label: string;
  columns: { period: string; state: string; records: string; reason: string };
  /** The state words (the Coverage grid's own). */
  states: Record<GapState, string>;
  /** A held snapshot's row: "Snapshot of 6 May 2026", given the formatted date. */
  snapshot: (date: string) => string;
  /** A month with no snapshot: "April 2026", given the formatted month. */
  month: (month: string) => string;
  /** Why a month has no snapshot: a gap whose cause no rule explains. It says what we hold, not why ONRC published nothing. */
  missingSnapshot: string;
  /** "data through 6 May 2026" is the data-through line's kind label. */
  dataThroughKind: string;
  dataThrough: DataThroughDateCopy;
  /** No snapshot is held at all. */
  empty: string;
}

export interface SnapshotCoverageProps {
  /** ONRC's coverage grid (`coverage.grid`): one cell per snapshot, and a known gap per missing month. A cell's `quarter` is a date, or a month for a gap. */
  cells: readonly SnapshotCellData[];
  /** ONRC's data-through date (`sources`' entry of ONRC), when it has one. */
  dataThrough: DataThrough | undefined;
  locale: Locale;
  copy: SnapshotCoverageCopy;
}

const MONTH = /^\d{4}-\d{2}$/;

/** Why a cell is in its state: the hand-entered note as written, or for a known gap with no rule, the one sentence about a missing snapshot. */
const reasonOf = (cell: SnapshotCellData, copy: SnapshotCoverageCopy): string | null => cell.note ?? (cell.state === "KNOWN_GAP" && cell.rule === null ? copy.missingSnapshot : null);

/**
 * ONRC's Coverage: the data-through date and one row per monthly snapshot (newest first), with its state and registration count; a month with no snapshot is a
 * known gap and says so. ONRC has no quarter grid, so the quarter-by-kind grid of SEAP does not apply; the period of a cell is the snapshot's own date.
 */
export function SnapshotCoverage({ cells, dataThrough, locale, copy }: SnapshotCoverageProps) {
  // one row per snapshot: its REGISTRATION cell (a ROLE cell shares the newest snapshot's period and would show it twice)
  const rows = cells.filter((cell) => cell.kind === "REGISTRATION").sort((a, b) => b.quarter.localeCompare(a.quarter));
  return (
    <Stack spacing={2}>
      {dataThrough && (
        <Typography component="p" variant="body1">
          <DataThroughDate dataThrough={dataThrough} locale={locale} copy={copy.dataThrough} kindLabel={copy.dataThroughKind} />
        </Typography>
      )}
      {rows.length === 0 ? (
        <Typography role="status">{copy.empty}</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label={copy.label}>
            <TableHead>
              <TableRow>
                <TableCell>{copy.columns.period}</TableCell>
                <TableCell>{copy.columns.state}</TableCell>
                <TableCell align="right">{copy.columns.records}</TableCell>
                <TableCell>{copy.columns.reason}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((cell) => (
                <TableRow key={cell.quarter} data-state={cell.state}>
                  <TableCell>{MONTH.test(cell.quarter) ? copy.month(formatMonth(cell.quarter, locale)) : copy.snapshot(formatDate(cell.quarter, locale, "long"))}</TableCell>
                  <TableCell>{copy.states[cell.state]}</TableCell>
                  <TableCell align="right">{cell.state === "LOADED" ? formatCellCount(cell.records, locale) : ""}</TableCell>
                  <TableCell>{reasonOf(cell, copy)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
