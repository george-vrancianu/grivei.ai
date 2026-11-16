import { Box } from "../../../../../atoms/Box/index.ts";
import { Skeleton } from "../../../../../atoms/Skeleton/index.ts";
import { AMOUNT_COLUMN, nameColumnSx, pairSx, ROW_INSET, rowLayoutSx, SIGNALS_COLUMN } from "../../../../utils/resultRowColumns.ts";
import type { RowShape } from "../../rowSkeletonList.utils.ts";

export interface RowSkeletonProps {
  shape: RowShape;
  /** How faded this row is (the list fades down). */
  opacity: number;
}

/**
 * One placeholder entity row, on `EntityResultRow`'s columns: the name over a meta line on the left, then the Signals column (the chip's block) and the
 * amount column (right-aligned). Below 600 px the pair wraps under the name, left-aligned, as the real row's does.
 */
export function RowSkeleton({ shape, opacity }: RowSkeletonProps) {
  return (
    <Box component="li" sx={{ ...rowLayoutSx, px: ROW_INSET, opacity }}>
      <Box sx={{ ...nameColumnSx, display: "flex", flexDirection: "column", gap: "9px", py: "3px" }}>
        <Skeleton variant="rounded" width={shape.name} height={16} />
        <Skeleton variant="rounded" width={shape.meta} height={12} />
      </Box>
      <Box sx={{ ...pairSx, columnGap: 2 }}>
        <Box sx={{ width: { xs: "auto", sm: SIGNALS_COLUMN }, flex: "none", display: "flex" }}>
          <Skeleton variant="rounded" width={104} height={28} sx={{ borderRadius: "14px" }} />
        </Box>
        <Box sx={{ width: { xs: "auto", sm: AMOUNT_COLUMN }, flex: "none", display: "flex", justifyContent: { sm: "flex-end" } }}>
          <Skeleton variant="rounded" width={124} height={16} />
        </Box>
      </Box>
    </Box>
  );
}
