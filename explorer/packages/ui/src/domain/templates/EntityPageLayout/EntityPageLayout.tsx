import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { CiteLine, type CiteLineCopy } from "../../molecules/CiteLine/index.ts";
import { pageSx } from "../../utils/pageSx.ts";
import type { EntityPageView } from "../../types.ts";
import { EntityTabNav, type EntityTabNavCopy } from "./components/EntityTabNav/index.ts";

export interface EntityPageLayoutCopy extends EntityTabNavCopy {
  /** The line that shows this view's address and copies it ("Address of this view"). */
  cite: CiteLineCopy;
}

/** What the layout hands the header to draw in its foot strip: the tabs, and the citable address at the strip's right end (absent without a `citeUrl`). */
export interface EntityHeaderSlots {
  tabs: ReactNode;
  address: ReactNode;
}

export interface EntityPageLayoutProps {
  /** The page's header, drawn from the slots the layout builds: an `EntityHeader` (or its skeleton while the entity loads) takes them as its `tabs` and `address`. */
  header: (slots: EntityHeaderSlots) => ReactNode;
  /** The open tab. Overview is the default; each tab has its own URL. */
  view: EntityPageView;
  /** The URL of each tab. The caller owns routing (language prefix, query string). */
  tabHrefs: Record<EntityPageView, string>;
  /** The number beside a tab's name, formatted by the caller ("1,817"). Absent for a tab whose count is not known. */
  tabCounts?: Partial<Record<EntityPageView, string>>;
  /** The full URL of this view, scheme included ("https://grivei.ai/explore/authority/4384206"): shown without the scheme at the right end of the header's tab strip, with a button that copies it. */
  citeUrl?: string;
  /** Called with the href on a plain click on a tab, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  copy: EntityPageLayoutCopy;
  /** The open tab's body: the Overview widgets, the Records tab or the Relationships tab. */
  children: ReactNode;
}

/** The layout of an Entity page: the header with the three tabs (links with their counts) and the citable address in its foot strip, and the open tab's body. It fetches nothing and knows no router. */
export function EntityPageLayout({ header, view, tabHrefs, tabCounts, citeUrl, onNavigate, copy, children }: EntityPageLayoutProps) {
  const tabs = <EntityTabNav view={view} hrefs={tabHrefs} counts={tabCounts} onNavigate={onNavigate} copy={copy} />;
  const address = citeUrl ? <CiteLine url={citeUrl} copy={copy.cite} /> : undefined;
  return (
    <Stack component="main" spacing={2.5} sx={pageSx}>
      {header({ tabs, address })}
      <Box component="section" aria-label={copy.tabs[view]} sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Stack>
  );
}
