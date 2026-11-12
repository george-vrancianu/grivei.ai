import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapCellData } from "../../../../types.ts";
import { formatCellCount, kindLabel } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface CrawlOnlyListProps {
  /** The cells with crawl-only Records, in page order. */
  cells: readonly GapCellData[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** The crawl-only Records, one line per quarter and record kind. */
export function CrawlOnlyList({ cells, locale, copy }: CrawlOnlyListProps) {
  return (
    <>
      <Typography variant="body2" gutterBottom>{copy.crawlOnly.intro}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        {cells.map((cell) => (
          <li key={`${cell.quarter}/${cell.kind}`}>
            {copy.crawlOnly.line(kindLabel(cell.kind, copy.grid), copy.grid.quarterName(cell.quarter), cell.crawlOnly ?? 0, formatCellCount(cell.crawlOnly ?? 0, locale))}
          </li>
        ))}
      </Box>
    </>
  );
}
