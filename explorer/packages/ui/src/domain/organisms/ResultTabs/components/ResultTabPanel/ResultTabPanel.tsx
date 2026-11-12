import type { ReactNode } from "react";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

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
  /** "Show all n": the link's text and its URL; the link shows only with both, and when there are more results than shown. */
  showAll?: { href: string; text: string } | undefined;
}

/** One tab's panel: its rows, or one sentence when there are none, then the optional "show all" link. */
export function ResultTabPanel({ id, tabId, selected, children, shown, count, emptyText, showAll }: ResultTabPanelProps) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId} hidden={!selected}>
      {selected && (
        <>
          {shown === 0 ? <Typography>{emptyText}</Typography> : children}
          {showAll && count > shown && <Link href={showAll.href}>{showAll.text}</Link>}
        </>
      )}
    </div>
  );
}
