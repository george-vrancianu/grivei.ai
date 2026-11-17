import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { skeletonBlock } from "../../utils/skeletonBlock.tsx";
import { InsetFigure } from "../../molecules/InsetFigure/index.ts";
import { MoneyFlowPanel } from "../MoneyFlowPanel/index.ts";
import type { EntityRole } from "../../types.ts";
import type { RelationshipsTabSkeletonCopy } from "../RelationshipsTab/index.ts";

export type { RelationshipsTabSkeletonCopy } from "../RelationshipsTab/index.ts";

export interface RelationshipsTabSkeletonProps {
  /** The page's role: it picks the Money flow panel's meta line. */
  role: EntityRole;
  /** The Graph / Money flow toggle, real from the first frame (it is a page-level control). */
  toggle?: ReactNode;
  /** The view being loaded: the graph and its two panels, or the Money flow panel. */
  view?: "graph" | "flow";
  /** A counterparty is in the URL: the picked panel shows placeholders under its real title instead of the hint. */
  picked?: boolean;
  /** The page's `LoadingStatus`, in the header of the graph (or the Money flow) panel: the one `role="status"` text of a first load. */
  status: ReactNode;
  copy: RelationshipsTabSkeletonCopy;
}

/**
 * The Relationships tab on first load, before any answer, in the loaded tab's shape: the heading and the toggle, the graph panel (real title, the loading status in its header, a well where the graph will be),
 * the picked panel (real title and hint) and "By month" (real title, a well). The Money flow view is its one panel. The placeholders are `aria-hidden`. A refetch never shows this: it keeps the last answer on screen, dimmed.
 */
export function RelationshipsTabSkeleton({ role, toggle, view = "graph", picked = false, status, copy }: RelationshipsTabSkeletonProps) {
  const heading = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      <SectionHeading>{copy.heading}</SectionHeading>
      {toggle && <Box data-slot="flow-toggle">{toggle}</Box>}
    </Box>
  );
  if (view === "flow") {
    return (
      <Stack spacing={2}>
        {heading}
        <MoneyFlowPanel role={role} status={status} copy={copy.flow}>
          {skeletonBlock("100%", 320)}
        </MoneyFlowPanel>
      </Stack>
    );
  }
  return (
    <Stack spacing={2}>
      {heading}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 3 }}>
        <Box sx={{ flex: "1.3 1 520px", minWidth: 0 }}>
          <Panel heading={copy.graph.heading} aside={status}>
            <Well sx={{ p: 1.5 }}>{skeletonBlock("100%", 300)}</Well>
          </Panel>
        </Box>
        <Box sx={{ flex: "1 1 380px", minWidth: 0 }}>
          <Panel heading={copy.panel.eyebrow} label={copy.panel.label}>
            {picked ? (
              <>
                {skeletonBlock("60%", 22)}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  <InsetFigure label={copy.panel.awarded}>{skeletonBlock(96, 18)}</InsetFigure>
                  <InsetFigure label={copy.panel.records}>{skeletonBlock(48, 18)}</InsetFigure>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">{copy.panel.hint}</Typography>
            )}
          </Panel>
        </Box>
      </Box>
      <Panel heading={copy.timeline.heading}>
        <Well sx={{ p: 1.5 }}>{skeletonBlock("100%", 120)}</Well>
      </Panel>
    </Stack>
  );
}
