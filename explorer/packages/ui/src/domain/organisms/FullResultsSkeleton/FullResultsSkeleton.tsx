import type { ReactNode } from "react";
import { PillSkeleton } from "../../atoms/PillSkeleton/index.ts";
import { ColumnHead } from "../../molecules/ColumnHead/index.ts";
import type { EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { RowSkeletonList } from "../../molecules/RowSkeletonList/index.ts";
import { skeletonBlock } from "../../utils/skeletonBlock.tsx";
import type { ResultTab } from "../ResultTabs/index.ts";

export interface FullResultsSkeletonCopy {
  /** The open tab's name, as the heading ("Suppliers"): `FullResultsCopy.heading[tab]`. */
  heading: string;
  /** The column head's labels (`EntityResultRowCopy["head"]`), drawn over the Suppliers and Authorities rows from 600 px up, as the real lists do. */
  head: EntityResultRowCopy["head"];
}

export interface FullResultsSkeletonProps {
  copy: FullResultsSkeletonCopy;
  /** The open tab: Records has no column head. */
  tab: ResultTab;
  /** The header strip's right end: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
}

/**
 * The full-results panel on first load, before any answer: the kind with its real name and a block where the count pill goes, the column head (Suppliers and Authorities),
 * eight rows of blocks fading down and a block in the foot where the "Showing" line goes. Everything but the labels is `aria-hidden`. A refetch never shows this:
 * it keeps the last answer on screen, dimmed.
 */
export function FullResultsSkeleton({ copy, tab, status }: FullResultsSkeletonProps) {
  return (
    <Panel
      level="h2"
      label={copy.heading}
      flush
      heading={
        <>
          {copy.heading}
          <PillSkeleton />
        </>
      }
      aside={status}
      foot={skeletonBlock(132, 14)}
    >
      {tab !== "records" && <ColumnHead role={tab === "authorities" ? "authority" : "supplier"} copy={copy.head} inset />}
      <RowSkeletonList />
    </Panel>
  );
}
