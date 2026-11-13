import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { neutralLinkSx } from "../../../../utils/neutralLinkSx.ts";
import { StateNote } from "../../../../molecules/StateNote/index.ts";

export interface ResultTabPanelProps {
  /** The `id`s that tie the panel to its tab. */
  id: string;
  tabId: string;
  /** Only the selected panel renders its rows; the others stay in the DOM, hidden. */
  selected: boolean;
  /** The rows (a list) for this tab; replaced by `emptyText` when `shown` is 0. */
  children: ReactNode;
  shown: number;
  /** All results of the tab, to know whether "show all" has more to show. */
  count: number;
  emptyText: string;
  /** What to offer under the empty sentence (a link); the empty state is its own component, `StateNote`, so it can grow. */
  emptyAction?: ReactNode;
  /** "Show all n": the link's text and its URL; the link shows only with both, and when there are more results than shown. */
  showAll?: { href: string; text: string } | undefined;
}

/** One tab's panel: its rows, or one sentence when there are none, then the optional "show all" link. */
export function ResultTabPanel({ id, tabId, selected, children, shown, count, emptyText, emptyAction, showAll }: ResultTabPanelProps) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId} hidden={!selected}>
      {selected && (
        <>
          {shown === 0 ? <StateNote kind="empty" action={emptyAction}>{emptyText}</StateNote> : children}
          {showAll && count > shown && (
            <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Link href={showAll.href} sx={neutralLinkSx}>{showAll.text}</Link>
            </Box>
          )}
        </>
      )}
    </div>
  );
}
