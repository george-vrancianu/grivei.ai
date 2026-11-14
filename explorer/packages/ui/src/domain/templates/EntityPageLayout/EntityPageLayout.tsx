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

export interface EntityPageLayoutProps {
  /** The page's header: an `EntityHeader`, or a stand-in while the entity loads. */
  header: ReactNode;
  /** The open tab. Overview is the default; each tab has its own URL. */
  view: EntityPageView;
  /** The URL of each tab. The caller owns routing (language prefix, query string). */
  tabHrefs: Record<EntityPageView, string>;
  /** The number beside a tab's name, formatted by the caller ("1,817"). Absent for a tab whose count is not known. */
  tabCounts?: Partial<Record<EntityPageView, string>>;
  /** The full URL of this view, scheme included ("https://grivei.ai/explore/authority/4384206"): shown without the scheme under the tabs, with a button that copies it. */
  citeUrl?: string;
  /** Called with the href on a plain click on a tab, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  copy: EntityPageLayoutCopy;
  /** The open tab's body: the Overview widgets, the Records tab or the Relationships tab. */
  children: ReactNode;
}

/** The layout of an Entity page: the header, the three tabs as links with their counts, the citable address, and the open tab's body. It fetches nothing and knows no router. */
export function EntityPageLayout({ header, view, tabHrefs, tabCounts, citeUrl, onNavigate, copy, children }: EntityPageLayoutProps) {
  return (
    <Stack component="main" spacing={2.5} sx={pageSx}>
      {header}
      <Stack spacing={0.75}>
        <EntityTabNav view={view} hrefs={tabHrefs} counts={tabCounts} onNavigate={onNavigate} copy={copy} />
        {citeUrl && <CiteLine url={citeUrl} copy={copy.cite} />}
      </Stack>
      <Box component="section" aria-label={copy.tabs[view]} sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Stack>
  );
}
