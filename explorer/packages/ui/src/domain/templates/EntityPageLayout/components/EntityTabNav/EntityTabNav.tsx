import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { hover, selected } from "../../../../../theme/states.ts";
import { color, font, radius, size, type } from "../../../../../theme/tokens.ts";
import { CountPill } from "../../../../atoms/CountPill/index.ts";
import type { EntityPageView } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";

export const ENTITY_PAGE_VIEWS: readonly EntityPageView[] = ["overview", "records", "relationships"];

export interface EntityTabNavCopy {
  /** The accessible name of the navigation, e.g. "Sections of this page". */
  label: string;
  tabs: Record<EntityPageView, string>;
}

export interface EntityTabNavProps {
  /** The open tab; its link is marked `aria-current="page"`. */
  view: EntityPageView;
  /** Each tab's own URL. */
  hrefs: Record<EntityPageView, string>;
  /** The number beside a tab's name, already formatted in the locale ("1,817", "≈ 2.4M"); a tab without one shows its name alone. */
  counts?: Partial<Record<EntityPageView, string>>;
  onNavigate?: (href: string) => void;
  copy: EntityTabNavCopy;
}

const tabSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  minHeight: size.tab,
  px: 1.5,
  borderRadius: `${radius.control}px`,
  fontFamily: font.mono,
  fontSize: type.tab.size,
  color: color.muted,
  "&:hover": hover,
} as const;
/** The open tab: the shared selected fragment (line fill, inset accent outline, full-strength text), held on hover. No underline. */
const currentSx = { ...tabSx, ...selected, "&:hover": selected } as const;

/**
 * The three tabs as a navigation of links: every tab has its own URL, so it can be opened, copied and cited on its own.
 * Plain links, not an ARIA tablist: each one is a Tab stop and the open one is marked `aria-current="page"` and drawn in the selected state.
 * The nav has no border of its own: it is meant for a panel's foot strip. A count is a pill beside the name.
 */
export function EntityTabNav({ view, hrefs, counts, onNavigate, copy }: EntityTabNavProps) {
  return (
    <Box component="nav" aria-label={copy.label} sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, rowGap: 0.5 }}>
      {ENTITY_PAGE_VIEWS.map((v) => (
        <Link
          key={v}
          href={hrefs[v]}
          aria-current={v === view ? "page" : undefined}
          underline="none"
          sx={v === view ? currentSx : tabSx}
          onClick={followLink(hrefs[v], onNavigate)}
        >
          {copy.tabs[v]}
          {counts?.[v] !== undefined && <CountPill>{counts[v]}</CountPill>}
        </Link>
      ))}
    </Box>
  );
}
