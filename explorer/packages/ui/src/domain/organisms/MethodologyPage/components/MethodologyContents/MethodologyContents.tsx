import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { font, layout, type as typeScale } from "../../../../../theme/tokens.ts";
import { selected } from "../../../../../theme/states.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { listRowSx, listSx } from "../../../../utils/listSx.ts";
import { neutralLinkSx } from "../../../../utils/neutralLinkSx.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface MethodologyContentsProps {
  /** The panel's title and the list's accessible name: "On this page". */
  label: string;
  entries: readonly { anchor: string; label: string; indent?: boolean }[];
  /** The anchor of the section in view: its link is marked `aria-current="location"` and drawn in the selected state. */
  current?: string | null;
  sectionHref: (anchor: string) => string;
  /** A plain click on a link: the section is current at once, before the page scrolls. */
  onSelect?: (anchor: string) => void;
  onNavigate?: (href: string) => void;
}

/** The sticky header is about 80 px tall (there is no token for it): the panel stops this far from the top, clear of it, from `md`. */
const STICKY_TOP = layout.headerScrollPadding - 24;

/**
 * "On this page": a titled `Panel` (`h2`, flush) holding one link row per section, Signal rules indented. From `md` it is sticky below the header and scrolls inside itself when it is
 * taller than the window. The section in view is marked `aria-current="location"` in the selected state.
 */
export function MethodologyContents({ label, entries, current = null, sectionHref, onSelect, onNavigate }: MethodologyContentsProps) {
  return (
    <Box sx={{ position: { md: "sticky" }, top: { md: STICKY_TOP }, maxHeight: { md: `calc(100vh - ${STICKY_TOP + 16}px)` }, overflowY: { md: "auto" }, minWidth: 0 }}>
      <Panel heading={label} level="h2" flush>
        <Box component="nav" aria-label={label}>
          <Box component="ul" sx={listSx}>
            {entries.map(({ anchor, label: text, indent }) => {
              const href = sectionHref(anchor);
              const isCurrent = anchor === current;
              return (
                <Box component="li" key={anchor}>
                  <Link
                    href={href}
                    onClick={(event) => {
                      onSelect?.(anchor);
                      followLink(href, onNavigate)(event);
                    }}
                    aria-current={isCurrent ? "location" : undefined}
                    variant="body2"
                    underline="none"
                    sx={{ ...neutralLinkSx, ...listRowSx, display: "block", pl: indent ? 4 : 2, fontFamily: font.mono, fontSize: typeScale.meta.size, ...(isCurrent && { ...selected, "&:hover": selected }) }}
                  >
                    {text}
                  </Link>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Panel>
    </Box>
  );
}
