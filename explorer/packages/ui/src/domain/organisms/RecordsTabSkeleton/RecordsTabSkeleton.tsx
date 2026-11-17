import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { FilterBarRow } from "../../molecules/FilterBarRow/index.ts";
import { FilterStrip } from "../../molecules/FilterStrip/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { TotalSkeleton } from "../../molecules/TotalSkeleton/index.ts";
import type { EntityRole } from "../../types.ts";
import { listRowSx, listSx } from "../../utils/listSx.ts";
import { ROW_SHAPES, rowOpacity } from "../../utils/resultsSkeleton.ts";
import type { RecordsTabCopy } from "../RecordsTab/index.ts";
import { MenuPill } from "./components/MenuPill/index.ts";

/** The real labels the skeleton shows: the same strings the loaded tab uses. */
export type RecordsTabSkeletonCopy = Pick<RecordsTabCopy, "heading" | "totalHeading"> & {
  facets: { label: string; groups: RecordsTabCopy["facets"]["groups"] };
  total: { figures: Pick<RecordsTabCopy["total"]["figures"], "records" | "ceilings"> };
};

export interface RecordsTabSkeletonProps {
  /** The page's role: it names the counterparty menu. */
  role: EntityRole;
  /** The Records panel's header, right of the title: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
  copy: RecordsTabSkeletonCopy;
}

const ROWS = ROW_SHAPES.slice(0, 4);

/**
 * The Records tab on first load, before any answer, in the loaded tab's shape: the filter bar with the real menu names, the Total panel (real heading and labels over blocks),
 * and the Records panel with its real title, the loading status in its header and rows of blocks. The placeholders are `aria-hidden`. A refetch never shows this: it keeps the last answer on screen, dimmed.
 */
export function RecordsTabSkeleton({ role, status, copy }: RecordsTabSkeletonProps) {
  const groups = copy.facets.groups;
  const names = [groups.signal, groups.channel, groups.procedure, groups.year, role === "authority" ? groups.counterpartyOfAuthority : groups.counterpartyOfSupplier, groups.badge];
  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 0, minWidth: 0, overflow: "hidden" }}>
        <FilterStrip>
          <FilterBarRow>
            {names.map((name) => (
              <MenuPill key={name} label={name} />
            ))}
          </FilterBarRow>
        </FilterStrip>
      </Card>
      <Panel heading={copy.totalHeading} level="h2">
        <TotalSkeleton labels={copy.total.figures} />
      </Panel>
      <Panel heading={copy.heading} level="h2" flush aside={status}>
        <Box component="ul" aria-hidden="true" sx={listSx}>
          {ROWS.map((shape, index) => (
            <Box key={index} component="li" sx={{ py: listRowSx.py, px: listRowSx.px, opacity: rowOpacity(index) }}>
              <Stack spacing="9px" sx={{ py: "3px" }}>
                <Skeleton variant="rounded" width={shape.name} height={16} />
                <Skeleton variant="rounded" width={shape.meta} height={12} />
              </Stack>
            </Box>
          ))}
        </Box>
      </Panel>
    </Stack>
  );
}
