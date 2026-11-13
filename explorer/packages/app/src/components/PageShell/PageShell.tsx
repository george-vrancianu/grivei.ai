import type { ReactNode } from "react";
import { Stack, pageSx } from "@grivei/ui";

/** The bare page: the page's width and gutter from the theme's layout tokens, for the pages and states that have no template of their own (loading, an error, nothing found, the search page). */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <Stack component="main" spacing={2.5} sx={pageSx}>
      {children}
    </Stack>
  );
}
