import type { Locale } from "../../../theme/index.ts";
import { coverage } from "../../../theme/tokens.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import type { GapCellData } from "../../types.ts";
import { CoverageCell } from "../../molecules/CoverageCell/index.ts";
import { CoverageGridLegend } from "../../molecules/CoverageGridLegend/index.ts";
import type { CoverageGridCopy, GridWindow } from "../../utils/coverageGrid.types.ts";
import { followLink } from "../../utils/followLink.ts";
import { RANGE_COLOR, gridShape, kindLabel, parseQuarter, quarterInWindow, windowActive } from "../../utils/coverageGrid.ts";

export interface CoverageGridCompactProps {
  cells: readonly GapCellData[];
  dateWindow?: GridWindow | null;
  locale: Locale;
  copy: CoverageGridCopy;
  /** Where "see the Coverage page" goes: the app supplies the locale path and the current query. */
  href: string;
  /** Called with the href on a plain click, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
}

/**
 * The small grid for the Coverage lens's side panel: the same cells as the full grid, shrunk to squares with no visible text
 * (each keeps its accessible name and a tooltip), a condensed legend, and a link to the Coverage page.
 */
export function CoverageGridCompact({ cells, dateWindow, locale, copy, href, onNavigate }: CoverageGridCompactProps) {
  const { quarters, kinds, at } = gridShape(cells);
  return (
    <Box data-compact>
      <TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }} tabIndex={0} role="region" aria-label={copy.label}>
        <Table size="small" sx={{ borderCollapse: "separate", borderSpacing: 1, width: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" aria-label={copy.kindHeader} sx={{ p: 0, border: 0 }} />
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
                    sx={{ p: 0, height: coverage.compactYearHeight, minWidth: coverage.cellCompact.size, fontSize: coverage.compactYearFontSize, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "visible", textAlign: "left", color: "text.secondary", border: 0, borderBottom: "3px solid", borderBottomColor: inRange ? RANGE_COLOR : "transparent" }}
                  >
                    <span aria-hidden>{parsed && parsed.q === 1 ? parsed.year : ""}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {kinds.map((kind) => (
              <TableRow key={kind}>
                <TableCell component="th" scope="row" sx={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "background.default", p: 0, pr: 0.5, typography: "meta", fontSize: coverage.compactKindFontSize, color: "text.primary", whiteSpace: "nowrap", border: 0 }}>
                  {kindLabel(kind, copy)}
                </TableCell>
                {quarters.map((quarter) => (
                  <CoverageCell key={quarter} cell={at(quarter, kind) ?? null} quarter={quarter} kind={kind} inRange={quarterInWindow(quarter, dateWindow)} compact locale={locale} copy={copy} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CoverageGridLegend copy={copy} condensed showRange={windowActive(dateWindow)} />
      <Link
        href={href}
        onClick={followLink(href, onNavigate)}
        sx={{ display: "inline-block", mt: 1, fontSize: coverage.compactLinkFontSize }}
      >
        {copy.seePage}
      </Link>
    </Box>
  );
}
