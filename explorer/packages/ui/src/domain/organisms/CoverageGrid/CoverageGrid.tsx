import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
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
import { RANGE_COLOR, gridShape, kindLabel, parseQuarter, quarterInWindow, windowActive, yearGroups } from "../../utils/coverageGrid.ts";

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

const stickyLabel = { position: "sticky", left: 0, zIndex: 2, backgroundColor: "background.default", whiteSpace: "nowrap", typography: "meta", color: "text.primary", pr: 2, border: 0 } as const;

/**
 * The quarter x record-kind grid of one Source: quarters as columns, kinds as rows. Each cell shows its state by colour, glyph and border,
 * and carries the state, quarter, kind, Record count, reason and data-through as its accessible name. Columns in the date window are marked
 * (`data-in-range`, `aria-current`). A wide grid scrolls sideways with the kind labels sticky.
 */
export function CoverageGrid({ cells, dateWindow, locale, copy, hideLegend = false }: CoverageGridProps) {
  const { quarters, kinds, at } = gridShape(cells);
  const active = windowActive(dateWindow);
  const years = yearGroups(quarters);
  return (
    <Box sx={{ minWidth: 0 }}>
      {!hideLegend && <Typography variant="meta" component="p" sx={{ m: 0, mb: 1, textAlign: { sm: "right" } }}>{copy.windowNote}</Typography>}
      <TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }} tabIndex={0} aria-label={copy.label} role="region">
        <Table size="small" sx={{ borderCollapse: "separate", borderSpacing: "3px", width: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" rowSpan={2} sx={{ ...stickyLabel, zIndex: 3, verticalAlign: "bottom" }}>{copy.kindHeader}</TableCell>
              {years.map(({ label, span }, i) => (
                <TableCell key={`${label}-${i}`} component="th" scope="colgroup" colSpan={span} aria-hidden sx={{ p: 0.5, border: 0, textAlign: "left", typography: "meta", color: "text.secondary" }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
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
                      fontSize: 11,
                      lineHeight: 1.2,
                      border: 0,
                      borderBottom: 2,
                      borderBottomColor: inRange ? RANGE_COLOR : "transparent",
                      fontWeight: inRange ? 600 : 400,
                      color: inRange ? "text.primary" : "text.secondary",
                    }}
                  >
                    <span aria-hidden>{parsed ? `Q${parsed.q}` : ""}</span>
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
