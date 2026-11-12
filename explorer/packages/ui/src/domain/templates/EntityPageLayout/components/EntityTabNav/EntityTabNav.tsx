import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
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
  onNavigate?: (href: string) => void;
  copy: EntityTabNavCopy;
}

/**
 * The three tabs as a navigation of links: every tab has its own URL, so it can be opened, copied and cited on its own.
 * Plain links, not an ARIA tablist: each one is a Tab stop and the open one is marked `aria-current="page"`.
 */
export function EntityTabNav({ view, hrefs, onNavigate, copy }: EntityTabNavProps) {
  return (
    <Stack component="nav" aria-label={copy.label} direction="row" spacing={3} sx={{ borderBottom: 1, borderColor: "divider" }}>
      {ENTITY_PAGE_VIEWS.map((v) => {
        const current = v === view;
        return (
          <Link
            key={v}
            href={hrefs[v]}
            aria-current={current ? "page" : undefined}
            underline={current ? "none" : "hover"}
            color={current ? "primary" : "text.secondary"}
            sx={{
              py: 1.5,
              fontWeight: current ? 700 : 400,
              borderBottom: 2,
              borderColor: current ? "primary.main" : "transparent",
              mb: "-1px",
            }}
            onClick={followLink(hrefs[v], onNavigate)}
          >
            {copy.tabs[v]}
          </Link>
        );
      })}
    </Stack>
  );
}
