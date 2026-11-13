import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { color, font, size, type } from "../../../../../theme/tokens.ts";
import type { EntityPageView } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";

export const ENTITY_PAGE_VIEWS: readonly EntityPageView[] = ["overview", "records", "relationships"];

export interface EntityTabNavCopy {
  /** The accessible name of the navigation, e.g. "Sections of this page". */
  label: string;
  tabs: Record<EntityPageView, string>;
  /** The accessible name of the line that shows this view's address, e.g. "Address of this view". */
  cite: string;
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

/**
 * The three tabs as a navigation of links: every tab has its own URL, so it can be opened, copied and cited on its own.
 * Plain links, not an ARIA tablist: each one is a Tab stop and the open one is marked `aria-current="page"`.
 */
export function EntityTabNav({ view, hrefs, counts, onNavigate, copy }: EntityTabNavProps) {
  return (
    <Box component="nav" aria-label={copy.label} sx={{ display: "flex", flexWrap: "wrap", columnGap: "28px", borderBottom: 1, borderColor: "divider" }}>
      {ENTITY_PAGE_VIEWS.map((v) => {
        const current = v === view;
        return (
          <Link
            key={v}
            href={hrefs[v]}
            aria-current={current ? "page" : undefined}
            underline="none"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minHeight: size.tab,
              fontFamily: font.mono,
              fontSize: type.tab.size,
              color: current ? color.text : color.muted,
              borderBottom: 2,
              borderColor: current ? color.accent : "transparent",
              mb: "-1px",
              "&:hover": { color: color.text },
            }}
            onClick={followLink(hrefs[v], onNavigate)}
          >
            {copy.tabs[v]}
            {counts?.[v] !== undefined && <span>{counts[v]}</span>}
          </Link>
        );
      })}
    </Box>
  );
}
