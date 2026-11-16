import { CoveragePageLayout, Panel, SourcePicker, Typography, type Locale } from "@grivei/ui";
import { CoveragePage as CoveragePageOperation } from "../../graphql/operations.ts";
import { useHeldQuery } from "../../graphql/useHeldQuery.ts";
import { OnrcCoverageSection } from "../../components/OnrcCoverageSection/index.ts";
import { PageShell } from "../../components/PageShell/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { methodologyHref } from "../../methodology/methodologyLinks.ts";
import { asSource, NO_COUNTS, pickerOptions } from "../../sources/sourceCounts.ts";
import { coverageSourceHref } from "../../sources/sourceLinks.ts";
import { encodeUrlState } from "../../urlState/codec.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { highlightWindow } from "./coveragePage.utils.ts";
import { useOnrcCoverage } from "./hooks/useOnrcCoverage.ts";
import type { CoveragePageVariables } from "./coveragePage.types.ts";

export interface CoveragePageProps {
  locale: Locale;
}

/** The whole grid: no window, so every quarter of the harvest comes back (the API cuts the grid to a window, and the page wants the rest too). */
const WHOLE_GRID: CoveragePageVariables = {};

/**
 * `/explore/coverage`: the quarter x record-kind grid, data-through per kind, known gaps and rules, the MF snapshot date.
 * The page asks `CoveragePage` for the whole grid; the date chip's window (`from`/`to` in the URL) only highlights the columns it overlaps.
 * The Source selector (#178) is `source=onrc` in the URL: ONRC's coverage is its monthly snapshots (`OnrcCoverage`), not a quarter grid. Without it, SEAP's, as every earlier link means.
 */
export function CoveragePage({ locale }: CoveragePageProps) {
  const t = useCopy();
  const { filter, source = "SEAP" } = useUrlState();
  const onrc = source === "ONRC";
  const state = useHeldQuery(CoveragePageOperation, onrc ? null : WHOLE_GRID);
  const onrcState = useOnrcCoverage(onrc);
  const sourceSelector = (
    <SourcePicker options={pickerOptions(t.sources, NO_COUNTS, locale)} selected={source} onSelect={(id) => navigate(coverageSourceHref(locale, asSource(id), filter), "push")} copy={t.sources.coverageSwitch} />
  );
  if (onrc) {
    const copy = t.sources.onrc.coverage;
    return (
      <PageShell>
        <Typography variant="label" component="p" color="primary.main" sx={{ m: 0 }}>
          {copy.eyebrow}
        </Typography>
        <Typography variant="h1" component="h1">
          {copy.title}
        </Typography>
        <Typography variant="lead">{copy.intro}</Typography>
        <Panel heading={copy.heading} level="h2" aside={sourceSelector}>
          <OnrcCoverageSection
            coverage={onrcState.status === "ready" ? onrcState.data : null}
            loading={onrcState.status === "loading"}
            failed={onrcState.status === "error"}
            locale={locale}
            copy={{ ...copy.snapshots, states: t.coverage.grid.states }}
            status={{ loading: t.status.loading, failed: t.status.failed }}
          />
        </Panel>
      </PageShell>
    );
  }
  return (
    <CoveragePageLayout
      status={state.status}
      busy={state.status === "ready" && state.stale}
      retry={state.status === "error" ? { label: t.status.retry, onRetry: state.retry } : undefined}
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
      methodologyHref={methodologyHref(locale, "coverageStatuses")}
      lensHref={`${pathFor(locale, { name: "main" })}${encodeUrlState({ filter, lens: "coverage" })}`}
      onNavigate={(href) => navigate(href, "push")}
      sourceSelector={sourceSelector}
      copy={t.coverage}
    />
  );
}
