import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Skeleton } from "../../../../../atoms/Skeleton/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import type { EntityOverviewCopy } from "../../EntityOverview.tsx";
import { HeadlineFigure } from "../HeadlineFigure/index.ts";
import { OverviewColumns } from "../OverviewColumns/index.ts";

export interface OverviewSkeletonProps {
  /** The Overview's own copy: the labels and headings are the real ones. */
  copy: EntityOverviewCopy;
  /** The loading status, at the right end of the Signals heading's line (`LoadingStatus`): it is what a screen reader hears; the rest of the skeleton (blocks and labels alike) is `aria-hidden`. */
  status: ReactNode;
}

const block = (width: number | string, height: number) => <Skeleton aria-hidden="true" variant="rounded" width={width} height={height} />;

/** Three list rows: a name and an amount, then the share bar, as the list panels draw them. */
function RowBlocks() {
  return (
    <Stack component="div" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <Stack key={row} spacing={0.75} sx={{ py: 1.5, px: 2, "& + &": { borderTop: 1, borderColor: "divider" } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            {block("45%", 20)}
            {block(96, 20)}
          </Box>
          {block("100%", 6)}
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * The Overview on first load: the same layout as `EntityOverview`, with a block where each value goes and the real labels and headings (the four headline labels, the panel titles and
 * their header metas). Sections that may be absent (Consortia, Appears in SEAP as) are not drawn.
 */
export function OverviewSkeleton({ copy, status }: OverviewSkeletonProps) {
  const headline = copy.headline;
  return (
    <Stack spacing={3}>
      <Box component="ul" aria-hidden="true" sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", m: 0, p: 0 }}>
        {[headline.total, headline.counterparties, headline.directPurchase, headline.signals].map((label) => (
          <HeadlineFigure key={label} label={label}>
            {block(120, 32)}
          </HeadlineFigure>
        ))}
      </Box>
      <OverviewColumns
        left={
          <>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 36 }}>
                <Box aria-hidden="true">
                  <SectionHeading>{copy.signals.heading(0, "…")}</SectionHeading>
                </Box>
                {status}
              </Box>
              {block("100%", 168)}
              {block("100%", 168)}
            </Stack>
            <Box aria-hidden="true">
              <Panel heading={copy.largest.heading} level="h2" flush>
                <RowBlocks />
              </Panel>
            </Box>
            <Box aria-hidden="true">
              <Panel heading={copy.frameworks.heading} level="h2">
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  <InsetFigure label={copy.frameworks.agreements}>{block(48, 22)}</InsetFigure>
                  <InsetFigure label={copy.frameworks.ceilings}>{block(120, 22)}</InsetFigure>
                  <InsetFigure label={copy.frameworks.subsequent}>{block(120, 22)}</InsetFigure>
                </Box>
              </Panel>
            </Box>
          </>
        }
        right={
          <Box aria-hidden="true" sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
            <Panel heading={copy.counterparties.heading} level="h2" aside={copy.counterparties.meta} flush>
              <RowBlocks />
            </Panel>
            <Panel heading={copy.procedures.heading} level="h2" aside={copy.procedures.meta} flush>
              <RowBlocks />
            </Panel>
          </Box>
        }
      />
    </Stack>
  );
}
