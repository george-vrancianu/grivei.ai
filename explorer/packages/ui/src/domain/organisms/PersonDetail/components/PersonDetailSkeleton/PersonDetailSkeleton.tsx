import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { listSx } from "../../../../utils/listSx.ts";
import { skeletonBlock } from "../../../../utils/skeletonBlock.tsx";
import type { PersonDetailCopy } from "../../PersonDetail.tsx";
import { PersonFrame } from "../PersonFrame/index.ts";
import { PersonPanel } from "../PersonPanel/index.ts";
import { PersonRoleRowShell } from "../PersonRoleRow/index.ts";

export interface PersonDetailSkeletonProps {
  /** The notice, the breadcrumb, the figure labels and the Roles title are real; the rest is blocks. */
  copy: Pick<PersonDetailCopy, "privateView" | "breadcrumb" | "figures" | "rolesHeading">;
  homeHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  /** The Roles panel's header strip, right end: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
}

/** The person page on first load, before any answer: the real notice, breadcrumb, figure labels and Roles title around blocks for the name, the figure values and three rows. A refetch never shows this. */
export function PersonDetailSkeleton({ copy, homeHref, onNavigate, status }: PersonDetailSkeletonProps) {
  return (
    <PersonFrame privateView={copy.privateView}>
      <PersonPanel homeHref={homeHref} onNavigate={onNavigate} breadcrumb={copy.breadcrumb}>
        <Box aria-hidden="true">{skeletonBlock("min(420px, 90%)", 40)}</Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <InsetFigure label={copy.figures.born}>{skeletonBlock(56, 22)}</InsetFigure>
          <InsetFigure label={copy.figures.roles}>{skeletonBlock(32, 22)}</InsetFigure>
          <InsetFigure label={copy.figures.source} note={skeletonBlock(140, 14)}>
            {skeletonBlock(72, 22)}
          </InsetFigure>
        </Box>
      </PersonPanel>
      <Panel heading={copy.rolesHeading} level="h2" flush aside={status}>
        <Box component="ul" aria-hidden="true" sx={listSx}>
          {[60, 45, 52].map((width) => (
            <PersonRoleRowShell key={width}>
              <Stack spacing={0.75} sx={{ flex: 1 }}>
                {skeletonBlock(`${width}%`, 18)}
                {skeletonBlock(160, 14)}
              </Stack>
              {skeletonBlock(96, 24)}
            </PersonRoleRowShell>
          ))}
        </Box>
      </Panel>
    </PersonFrame>
  );
}
