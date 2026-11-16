import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { InsetFigure } from "../InsetFigure/index.ts";
import type { InsetFigureLabels } from "../TotalFigure/index.ts";

export interface TotalSkeletonProps {
  /** Shown above the amount's block, as `TotalFigure` shows it (the real "Total awarded" heading). */
  heading?: ReactNode;
  /** The real labels of the inset figures; the skeleton draws the two every search has (Records, and the framework ceilings), each with a block where the value goes. */
  labels: Pick<InsetFigureLabels, "records" | "ceilings">;
}

/**
 * The main screen's Total on first load: the amount as one block, and each inset figure with its real label over a block for its value. The
 * same wrapping layout as the inset `TotalFigure`. The blocks are `aria-hidden`; the page's `role="status"` line says it is loading.
 */
export function TotalSkeleton({ heading, labels }: TotalSkeletonProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "16px 20px" }}>
      <Stack spacing={1} sx={{ flex: "2 1 360px", minWidth: 0, justifyContent: "center" }}>
        {heading}
        <Skeleton aria-hidden="true" variant="rounded" width="min(360px, 90%)" height={40} />
      </Stack>
      <InsetFigure label={labels.records}>
        <Skeleton aria-hidden="true" variant="rounded" width={72} height={22} sx={{ my: "2px" }} />
      </InsetFigure>
      <InsetFigure label={labels.ceilings}>
        <Skeleton aria-hidden="true" variant="rounded" width={168} height={22} sx={{ my: "2px" }} />
      </InsetFigure>
    </Box>
  );
}
