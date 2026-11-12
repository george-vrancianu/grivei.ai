import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Table } from "../../../atoms/Table/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import type { GapCellData } from "../../types.ts";
import { CoverageCell } from "../CoverageGrid/components/CoverageCell/index.ts";
import { CoverageGridLegend } from "../CoverageGrid/components/CoverageGridLegend/index.ts";
import type { CoverageGridCopy, GridWindow } from "../CoverageGrid/coverageGrid.types.ts";
import { followLink } from "../../utils/followLink.ts";
import { gridShape, kindLabel, quarterInWindow, windowActive } from "../CoverageGrid/coverageGrid.utils.ts";

export interface CoverageGridCompactProps {
  cells: readonly GapCellData[];
  window?: GridWindow | null;
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
export function CoverageGridCompact({ cells, window, locale, copy, href, onNavigate }: CoverageGridCompactProps) {
  const { quarters, kinds, at } = gridShape(cells);
  return (
    <Box data-compact>
      <TableContainer sx={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label={copy.label}>
        <Table aria-label={copy.label} size="small" sx={{ borderCollapse: "separate", borderSpacing: 1, width: "auto" }}>
          <TableBody>
            {kinds.map((kind) => (
              <TableRow key={kind}>
                <TableCell component="th" scope="row" sx={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "background.paper", p: 0, pr: 0.5, fontSize: 11, whiteSpace: "nowrap", fontWeight: 600, border: 0 }}>
                  {kindLabel(kind, copy)}
                </TableCell>
                {quarters.map((quarter) => (
                  <CoverageCell key={quarter} cell={at(quarter, kind) ?? null} quarter={quarter} kind={kind} inRange={quarterInWindow(quarter, window)} compact locale={locale} copy={copy} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CoverageGridLegend copy={copy} condensed showRange={windowActive(window)} />
      <Link
        href={href}
        onClick={followLink(href, onNavigate)}
        sx={{ display: "inline-block", mt: 1, fontSize: 13 }}
      >
        {copy.seePage}
      </Link>
    </Box>
  );
}
