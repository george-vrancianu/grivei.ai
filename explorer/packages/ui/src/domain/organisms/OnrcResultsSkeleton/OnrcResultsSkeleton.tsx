import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { listRowSx, listSx } from "../../utils/listSx.ts";
import { ROW_SHAPES, rowOpacity } from "../../utils/resultsSkeleton.ts";

export interface OnrcResultsSkeletonProps {
  /** The panel's title before any count is known: `OnrcResultsCopy.title` ("Registrations"). */
  title: string;
  /** The header strip's right slot: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
}

const ROWS = ROW_SHAPES.slice(0, 3);

/**
 * `OnrcResults` on first load, before any answer: the panel with its real title and the loading status at the right of the header, and three rows of blocks (a name over a
 * meta line, a tag) in the real rows' padding. The rows are `aria-hidden`. A refetch never shows this: it keeps the last answer on screen, dimmed.
 */
export function OnrcResultsSkeleton({ title, status }: OnrcResultsSkeletonProps) {
  return (
    <Panel heading={title} level="h2" flush aside={status}>
      <Box component="ul" aria-hidden="true" sx={listSx}>
        {ROWS.map((shape, index) => (
          <Box key={index} component="li" sx={{ py: listRowSx.py, px: listRowSx.px, opacity: rowOpacity(index) }}>
            <Stack spacing="9px" sx={{ py: "3px" }}>
              <Skeleton variant="rounded" width={shape.name} height={16} />
              <Skeleton variant="rounded" width={shape.meta} height={12} />
              <Skeleton variant="rounded" width={92} height={22} sx={{ borderRadius: "11px" }} />
            </Stack>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}
