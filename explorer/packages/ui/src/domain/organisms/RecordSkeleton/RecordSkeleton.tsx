import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { layout } from "../../../theme/tokens.ts";
import { InsetFigure } from "../../molecules/InsetFigure/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { pageSx } from "../../utils/pageSx.ts";
import { skeletonBlock } from "../../utils/skeletonBlock.tsx";

export interface RecordSkeletonCopy {
  /** The value panel's title and its two figures' labels. */
  value: { heading: string; published: string; counted: string };
  /** The winners panel's title. */
  winners: string;
  /** The side column's first panel ("The Record"). */
  facts: string;
}

export interface RecordSkeletonProps {
  copy: RecordSkeletonCopy;
  /** The value panel's header strip, right end: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
}

/**
 * The Record page on first load, before any answer: the title and the actions as blocks on the ground, the value panel with its real title and labels over a block for
 * each figure, the winners panel with a well per winner, and the Record's facts in the side column, each row a block. Everything but the labels is `aria-hidden`.
 * A refetch never shows this: it keeps the last answer on screen, dimmed.
 */
export function RecordSkeleton({ copy, status }: RecordSkeletonProps) {
  return (
    <Stack component="main" spacing={3} sx={pageSx}>
      <Stack spacing={2} aria-hidden="true">
        {skeletonBlock(160, 20)}
        <Skeleton variant="rounded" width="min(640px, 90%)" height={40} />
        {skeletonBlock(176, 44)}
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: `minmax(0, 1fr) ${layout.sideColumn}px` }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Panel heading={copy.value.heading} level="h2" aside={status}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "16px 20px" }}>
              <Stack spacing={0.5} sx={{ flex: "2 1 280px", minWidth: 0, justifyContent: "center" }}>
                <Typography variant="meta">{copy.value.published}</Typography>
                <Skeleton aria-hidden="true" variant="rounded" width="min(360px, 90%)" height={40} />
              </Stack>
              <InsetFigure label={copy.value.counted}>
                <Skeleton aria-hidden="true" variant="rounded" width={168} height={22} sx={{ my: "2px" }} />
              </InsetFigure>
            </Box>
          </Panel>
          <Panel heading={copy.winners} level="h2">
            <Box aria-hidden="true" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
              <Well sx={{ px: 2, py: 1.5 }}>{skeletonBlock("70%", 20)}</Well>
            </Box>
          </Panel>
        </Stack>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Panel heading={copy.facts} level="h2">
            <Stack spacing={1.5} aria-hidden="true">
              {[60, 80, 70, 50].map((width, index) => (
                <Box key={index} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  {skeletonBlock(72, 16)}
                  {skeletonBlock(`${width}%`, 16)}
                </Box>
              ))}
            </Stack>
          </Panel>
        </Stack>
      </Box>
    </Stack>
  );
}
