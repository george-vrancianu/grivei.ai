import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { EntityPageView } from "../../types.ts";
import { EntityTabNav, type EntityTabNavCopy } from "./components/EntityTabNav/index.ts";

export type EntityPageLayoutCopy = EntityTabNavCopy;

export interface EntityPageLayoutProps {
  /** The page's header: an `EntityHeader`, or a stand-in while the entity loads. */
  header: ReactNode;
  /** The open tab. Overview is the default; each tab has its own URL. */
  view: EntityPageView;
  /** The URL of each tab. The caller owns routing (language prefix, query string). */
  tabHrefs: Record<EntityPageView, string>;
  /** Called with the href on a plain click on a tab, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  copy: EntityPageLayoutCopy;
  /** The open tab's body: the Overview widgets, the Records tab or the Relationships tab. */
  children: ReactNode;
}

/** The layout of an Entity page: header, the three tabs as links, and the open tab's body. It fetches nothing and knows no router. */
export function EntityPageLayout({ header, view, tabHrefs, onNavigate, copy, children }: EntityPageLayoutProps) {
  return (
    <Stack component="main" spacing={3} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {header}
      <EntityTabNav view={view} hrefs={tabHrefs} onNavigate={onNavigate} copy={copy} />
      <Box component="section" aria-label={copy.tabs[view]}>
        {children}
      </Box>
    </Stack>
  );
}
