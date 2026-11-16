import { Box } from "../../../../../atoms/Box/index.ts";
import { Skeleton } from "../../../../../atoms/Skeleton/index.ts";
import type { RowShape } from "../../resultsSkeleton.utils.ts";

export interface RowSkeletonProps {
  shape: RowShape;
  /** How faded this row is (the list fades down). */
  opacity: number;
}

/** The columns of an entity row (the Signals column and the amount column, in px); the pair wraps under the name on a narrow screen, as the real row's does. */
const SIGNALS_COLUMN = 136;
const AMOUNT_COLUMN = 150;

/** One placeholder entity row. */
export function RowSkeleton({ shape, opacity }: RowSkeletonProps) {
  return (
    <Box component="li" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", px: 2.5, py: 1.5, opacity, "& + &": { borderTop: 1, borderColor: "divider" } }}>
      <Box sx={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: "9px", py: "3px" }}>
        <Skeleton variant="rounded" width={shape.name} height={16} />
        <Skeleton variant="rounded" width={shape.meta} height={12} />
      </Box>
      <Box sx={{ flex: "none", display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ width: SIGNALS_COLUMN, display: "flex" }}>
          <Skeleton variant="rounded" width={104} height={28} sx={{ borderRadius: "14px" }} />
        </Box>
        <Box sx={{ width: AMOUNT_COLUMN, display: "flex", justifyContent: "flex-end" }}>
          <Skeleton variant="rounded" width={124} height={16} />
        </Box>
      </Box>
    </Box>
  );
}
