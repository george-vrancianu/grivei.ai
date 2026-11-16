import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { followLink } from "../../../../utils/followLink.ts";
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

/** One tab's panel: its rows, or one sentence when there are none, then the optional "show all" button, centred at the foot. */
export function ResultTabPanel({ id, tabId, selected, children, shown, count, emptyText, emptyLink, onNavigate, showAll }: ResultTabPanelProps) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId} hidden={!selected}>
      {selected && (
        <>
          {shown === 0 ? (
            <Box sx={{ px: 2.5, py: 1 }}>
              <StateNote
                kind="empty"
                action={emptyLink && <Link href={emptyLink.href} onClick={followLink(emptyLink.href, onNavigate)} sx={{ alignSelf: "flex-start" }}>{emptyLink.text}</Link>}
              >
                {emptyText}
              </StateNote>
            </Box>
          ) : (
            // The lists run flush to the panel (`inset`): the column head sits under the tab header and the row fills reach both edges.
            <Box sx={{ pb: 1 }}>{children}</Box>
          )}
          {showAll && count > shown && (
            <Box sx={{ py: 2, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "center" }}>
              {/* A raised button that is still a link (it has an href); in the body colour, since amber is for the headline Total alone. */}
              <Button variant="outlined" color="inherit" href={showAll.href} onClick={followLink(showAll.href, onNavigate)}>
                {showAll.text}
              </Button>
            </Box>
          )}
        </>
      )}
    </div>
  );
}
