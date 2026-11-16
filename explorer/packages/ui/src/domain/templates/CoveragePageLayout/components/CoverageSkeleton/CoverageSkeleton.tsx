import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { skeletonBlock } from "../../../../utils/skeletonBlock.tsx";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface CoverageSkeletonProps {
  copy: CoveragePageLayoutCopy;
  /** The grid panel's header strip: the Source selector and the page's `LoadingStatus`, the one status text of a first load. */
  gridAside: ReactNode;
  /** The "How gaps are decided" panel, real: it needs no data. */
  rules: ReactNode;
}

/**
 * The Coverage page's panels on first load, before any answer: every panel keeps its real title, over blocks shaped like the grid, the known-gap rows, the data-through figures and the lines of text.
 * The rules panel is the real one. Crawl-only is left out (it only exists when the data has such Records). Every block is `aria-hidden`.
 */
export function CoverageSkeleton({ copy, gridAside, rules }: CoverageSkeletonProps) {
  return (
    <>
      <Panel heading={copy.gridHeading} level="h2" aside={gridAside}>
        <Well aria-hidden="true" sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {[0, 1, 2, 3].map((row) => (
            <Box key={row} sx={{ display: "flex", gap: 1 }}>
              {skeletonBlock(120, 22)}
              {skeletonBlock("70%", 22)}
            </Box>
          ))}
        </Well>
      </Panel>
      <Panel heading={copy.knownGaps.heading} level="h2" flush>
        <Stack spacing={1.5} aria-hidden="true" sx={{ p: 2 }}>
          {[90, 80, 85].map((width) => (
            <Box key={width}>{skeletonBlock(`${width}%`, 18)}</Box>
          ))}
        </Stack>
      </Panel>
      <Panel heading={copy.dataThrough.heading} level="h2">
        <Box aria-hidden="true" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {[0, 1, 2, 3].map((n) => (
            <Well key={n} sx={{ flex: "1 1 200px", px: 2, py: 1.5 }}>{skeletonBlock("60%", 40)}</Well>
          ))}
        </Box>
      </Panel>
      {rules}
      <Panel heading={copy.snapshot.heading} level="h2">
        <Box aria-hidden="true">{skeletonBlock("min(420px, 90%)", 18)}</Box>
      </Panel>
      <Panel heading={copy.perCounty.heading} level="h2">
        <Stack spacing={1} aria-hidden="true">
          {skeletonBlock("min(640px, 95%)", 18)}
          {skeletonBlock("min(480px, 80%)", 18)}
        </Stack>
      </Panel>
    </>
  );
}
