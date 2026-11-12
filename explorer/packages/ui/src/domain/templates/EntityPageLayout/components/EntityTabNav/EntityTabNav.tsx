import { Box } from "../../../../../atoms/Box/index.ts";
import { Tab } from "../../../../../atoms/Tab/index.ts";
import { Tabs } from "../../../../../atoms/Tabs/index.ts";
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

/** The three tabs as a navigation of links: every tab has its own URL, so it can be opened, copied and cited on its own. */
export function EntityTabNav({ view, hrefs, onNavigate, copy }: EntityTabNavProps) {
  return (
    <Box component="nav" aria-label={copy.label}>
      <Tabs value={view} role={undefined}>
        {ENTITY_PAGE_VIEWS.map((v) => (
          <Tab
            key={v}
            value={v}
            label={copy.tabs[v]}
            component="a"
            role={undefined}
            href={hrefs[v]}
            aria-current={v === view ? "page" : undefined}
            aria-selected={undefined}
            onClick={followLink(hrefs[v], onNavigate)}
          />
        ))}
      </Tabs>
    </Box>
  );
}
