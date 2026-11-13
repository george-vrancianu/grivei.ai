import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { followLink } from "../../../../utils/followLink.ts";
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
  /** The link under the empty sentence (the empty state is its own component, `StateNote`); shown with both its text and URL. */
  emptyLink?: { href: string; text: string } | undefined;
  /** A plain click on a link goes here instead of loading the page. */
  onNavigate?: ((href: string) => void) | undefined;
  /** "Show all n": the link's text and its URL; the link shows only with both, and when there are more results than shown. */
  showAll?: { href: string; text: string } | undefined;
}

/** One tab's panel: its rows, or one sentence when there are none, then the optional "show all" link. */
export function ResultTabPanel({ id, tabId, selected, children, shown, count, emptyText, emptyLink, onNavigate, showAll }: ResultTabPanelProps) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId} hidden={!selected}>
      {selected && (
        <>
          {shown === 0 ? (
            <StateNote
              kind="empty"
              action={emptyLink && <Link href={emptyLink.href} onClick={followLink(emptyLink.href, onNavigate)} sx={{ alignSelf: "flex-start" }}>{emptyLink.text}</Link>}
            >
              {emptyText}
            </StateNote>
          ) : (
            children
          )}
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
