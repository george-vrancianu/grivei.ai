import { CoveragePageLayout, type Locale } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { highlightWindow } from "./coveragePage.utils.ts";
import { useCoveragePage } from "./hooks/useCoveragePage.ts";
import type { CoveragePageVariables } from "./coveragePage.types.ts";

export interface CoveragePageProps {
  locale: Locale;
}

/** The whole grid: no window, so every quarter of the harvest comes back (the API cuts the grid to a window, and the page wants the rest too). */
const WHOLE_GRID: CoveragePageVariables = {};

/**
 * `/explore/coverage`: the quarter x record-kind grid, data-through per kind, known gaps and rules, the MF snapshot date.
 * The page asks `CoveragePage` for the whole grid; the date chip's window (`from`/`to` in the URL) only highlights the columns it overlaps.
 */
export function CoveragePage({ locale }: CoveragePageProps) {
  const t = useCopy();
  const { filter } = useUrlState();
  const state = useCoveragePage(WHOLE_GRID);
  return (
    <CoveragePageLayout
      status={state.status}
      content={
        state.status === "ready"
          ? {
              cells: state.data.coverage.grid,
              sources: state.data.sources,
              referenceSnapshot: state.data.coverage.referenceSnapshot,
              dateWindow: highlightWindow(filter),
            }
          : undefined
      }
      locale={locale}
      methodologyHref={pathFor(locale, { name: "methodology" })}
      onNavigate={(href) => navigate(href, "push")}
      copy={t.coverage}
    />
  );
}
