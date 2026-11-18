import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";

import type { EntityPageRole } from "../../../../types.ts";
import { HeaderFoot } from "../HeaderFoot/index.ts";
import { Breadcrumb } from "../../../../molecules/Breadcrumb/index.ts";
import type { EntityBreadcrumbCopy } from "../../EntityHeader.tsx";
import { skeletonBlock } from "../../../../utils/skeletonBlock.tsx";

export interface EntityHeaderSkeletonProps {
  /** The role the page shows (from the URL), so the breadcrumb is real. */
  role: EntityPageRole;
  homeHref: string;
  onNavigate?: (href: string) => void;
  /** The foot strip's left and right end, as for `EntityHeader`: the tabs and the address are real while the entity loads. */
  tabs?: ReactNode;
  address?: ReactNode;
  copy: { breadcrumb: EntityBreadcrumbCopy };
}

/** The entity header on a first load: the same panel as `EntityHeader`, with blocks for the name, the role chips and the identity facts; the breadcrumb, the tabs and the address are real. */
export function EntityHeaderSkeleton({ role, homeHref, onNavigate, tabs, address, copy }: EntityHeaderSkeletonProps) {
  return (
    <Card component="header" sx={{ p: 0, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Stack data-panel-part="body" spacing={1.75} sx={{ px: 2.5, pt: 2.5, pb: 2.25, minWidth: 0 }}>
        <Breadcrumb current={copy.breadcrumb.roles[role]} homeHref={homeHref} onNavigate={onNavigate} copy={copy.breadcrumb} />
        {skeletonBlock("min(420px, 80%)", 36)}
        {skeletonBlock(220, 28)}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
          {skeletonBlock(96, 36)}
          {skeletonBlock(220, 36)}
          {skeletonBlock(260, 36)}
        </Box>
      </Stack>
      <HeaderFoot tabs={tabs} address={address} />
    </Card>
  );
}
