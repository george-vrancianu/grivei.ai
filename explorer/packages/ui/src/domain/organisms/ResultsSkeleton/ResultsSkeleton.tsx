import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Tab } from "../../../atoms/Tab/index.ts";
import { Tabs } from "../../../atoms/Tabs/index.ts";
import { ColumnHead } from "../../molecules/ColumnHead/index.ts";
import type { EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { listSx } from "../../utils/listSx.ts";
import { DEFAULT_RESULT_TAB, RESULT_TABS, type ResultTab } from "../ResultTabs/index.ts";
import { PillSkeleton } from "./components/PillSkeleton/index.ts";
import { RowSkeleton } from "./components/RowSkeleton/index.ts";
import { ROW_COUNT, ROW_SHAPES, rowOpacity } from "../../utils/resultsSkeleton.ts";

export interface ResultsSkeletonProps {
  /** The tab list's accessible name and each tab's real name (`ResultTabsCopy.label` and `.tabs`). */
  copy: { label: string; tabs: Record<ResultTab, string> };
  /** The column head's labels (`EntityResultRowCopy["head"]`), drawn over the Suppliers and Authorities rows from 600 px up, as the real lists do. */
  head: EntityResultRowCopy["head"];
  /** The selected tab; Suppliers by default. */
  tab?: ResultTab;
  onTabChange?: (tab: ResultTab) => void;
  /** The line at the right end of the header: the page's `LoadingStatus`, the one `role="status"` text of a first load. */
  status: ReactNode;
}

/**
 * The results panel on first load, before any answer: the tabs with their real names and a pill-shaped block where each count goes, and the column head (Suppliers and Authorities), and eight
 * rows of blocks (a name over a meta line, a chip, an amount) fading down the list. The rows are `aria-hidden`. A refetch never shows this:
 * it keeps the last answer on screen, dimmed.
 */
export function ResultsSkeleton({ copy, head, tab = DEFAULT_RESULT_TAB, onTabChange, status }: ResultsSkeletonProps) {
  return (
    <Card sx={{ p: 0, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0 16px", px: 2.5, borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tab} onChange={(_event, next: ResultTab) => onTabChange?.(next)} aria-label={copy.label} sx={{ flex: "1 1 auto", minWidth: 0, borderBottom: 0 }}>
          {RESULT_TABS.map((name) => (
            <Tab
              key={name}
              value={name}
              label={
                <span>
                  {copy.tabs[name]} <PillSkeleton />
                </span>
              }
            />
          ))}
        </Tabs>
        <Box sx={{ flex: "none" }}>{status}</Box>
      </Box>
      {tab !== "records" && <ColumnHead role={tab === "authorities" ? "authority" : "supplier"} copy={head} inset />}
      <Box component="ul" aria-hidden="true" sx={listSx}>
        {ROW_SHAPES.slice(0, ROW_COUNT).map((shape, index) => (
          <RowSkeleton key={index} shape={shape} opacity={rowOpacity(index)} />
        ))}
      </Box>
    </Card>
  );
}
