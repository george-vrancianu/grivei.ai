import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import type { GapCellData } from "../../types.ts";
import { CoverageCell } from "../../molecules/CoverageCell/index.ts";
import { CoverageGridLegend } from "../../molecules/CoverageGridLegend/index.ts";
import type { CoverageGridCopy, GridWindow } from "../../utils/coverageGrid.types.ts";
import { RANGE_COLOR, gridShape, kindLabel, parseQuarter, quarterInWindow, windowActive } from "../../utils/coverageGrid.ts";

export interface CoverageGridProps {
  /** One Source's grid (`coverage.grid`). Quarters run from the earliest to the latest cell, kinds come from the cells. */
  cells: readonly GapCellData[];
  /** The date chip's window: the quarters overlapping it are highlighted. Open ends reach as far as the grid goes; no window highlights nothing. */
  dateWindow?: GridWindow | null;
  locale: Locale;
  copy: CoverageGridCopy;
  /** Hide the legend (a page can show it elsewhere). */
  hideLegend?: boolean;
}

const stickyLabel = { position: "sticky", left: 0, zIndex: 2, backgroundColor: "background.paper", whiteSpace: "nowrap", fontWeight: 600, borderRight: "1px solid", borderColor: "divider" } as const;

/**
 * The quarter x record-kind grid of one Source: quarters as columns, kinds as rows. Each cell shows its state by colour, glyph and border,
 * and carries the state, quarter, kind, Record count, reason and data-through as its accessible name. Columns in the date window are marked
 * (`data-in-range`, `aria-current`). A wide grid scrolls sideways with the kind labels sticky.
 */
export function CoverageGrid({ cells, dateWindow, locale, copy, hideLegend = false }: CoverageGridProps) {
  const { quarters, kinds, at } = gridShape(cells);
  const active = windowActive(dateWindow);
  return (
    <Box>
      <TableContainer sx={{ overflowX: "auto" }} tabIndex={0} aria-label={copy.label} role="region">
        <Table size="small" sx={{ borderCollapse: "separate", borderSpacing: 2, width: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" sx={{ ...stickyLabel, zIndex: 3 }}>{copy.kindHeader}</TableCell>
              {quarters.map((quarter) => {
                const inRange = quarterInWindow(quarter, dateWindow);
                const parsed = parseQuarter(quarter);
                return (
                  <TableCell
                    key={quarter}
                    component="th"
                    scope="col"
                    aria-label={copy.quarterName(quarter)}
                    aria-current={inRange ? "true" : undefined}
                    data-in-range={inRange ? "true" : undefined}
                    data-quarter={quarter}
                    sx={{
                      p: 0.5,
                      textAlign: "center",
                      fontSize: 12,
                      lineHeight: 1.2,
                      fontWeight: inRange ? 700 : 400,
                      ...(inRange ? { backgroundColor: RANGE_COLOR, color: "#fff" } : { color: "text.secondary" }),
                    }}
                  >
                    <span aria-hidden>
                      {parsed?.year ?? quarter}
                      <br />
                      {parsed ? `Q${parsed.q}` : ""}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {kinds.map((kind) => (
              <TableRow key={kind}>
                <TableCell component="th" scope="row" sx={stickyLabel}>{kindLabel(kind, copy)}</TableCell>
                {quarters.map((quarter) => (
                  <CoverageCell key={quarter} cell={at(quarter, kind) ?? null} quarter={quarter} kind={kind} inRange={quarterInWindow(quarter, dateWindow)} locale={locale} copy={copy} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!hideLegend && <CoverageGridLegend copy={copy} showRange={active} />}
    </Box>
  );
}
