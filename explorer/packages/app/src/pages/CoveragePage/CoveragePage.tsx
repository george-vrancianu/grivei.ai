import { CoveragePageLayout, type Locale } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { coverageVariables } from "./coveragePage.utils.ts";
import { useCoveragePage } from "./hooks/useCoveragePage.ts";

export interface CoveragePageProps {
  locale: Locale;
}

/**
 * `/explore/coverage`: the quarter x record-kind grid, data-through per kind, known gaps and rules, the MF snapshot date.
 * The date chip's window (`from`/`to` in the URL) goes to the `CoveragePage` operation and highlights the grid's columns.
 */
export function CoveragePage({ locale }: CoveragePageProps) {
  const t = useCopy();
  const { filter } = useUrlState();
  const state = useCoveragePage(coverageVariables(filter));
  return (
    <CoveragePageLayout
      status={state.status}
      content={
        state.status === "ready"
          ? {
              cells: state.data.coverage.grid,
              sources: state.data.sources,
              referenceSnapshot: state.data.coverage.referenceSnapshot,
              window: state.data.coverage.window,
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
