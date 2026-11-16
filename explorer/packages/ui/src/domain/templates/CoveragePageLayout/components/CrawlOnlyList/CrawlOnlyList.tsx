import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapCellData } from "../../../../types.ts";
import { listRowSx, listSx } from "../../../../utils/listSx.ts";
import { formatCellCount, kindLabel } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface CrawlOnlyListProps {
  /** The cells with crawl-only Records, in page order. */
  cells: readonly GapCellData[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** The body of the crawl-only panel (flush): the intro, then one row per quarter and record kind. */
export function CrawlOnlyList({ cells, locale, copy }: CrawlOnlyListProps) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ m: 0, p: 2, pb: 1.5 }}>{copy.crawlOnly.intro}</Typography>
      <Box component="ul" sx={{ ...listSx, borderTop: 1, borderColor: "divider" }}>
        {cells.map((cell) => (
          <Box component="li" key={`${cell.quarter}/${cell.kind}`} sx={listRowSx}>
            {copy.crawlOnly.line(kindLabel(cell.kind, copy.grid), copy.grid.quarterName(cell.quarter), cell.crawlOnly ?? 0, formatCellCount(cell.crawlOnly ?? 0, locale))}
          </Box>
        ))}
      </Box>
    </>
  );
}
