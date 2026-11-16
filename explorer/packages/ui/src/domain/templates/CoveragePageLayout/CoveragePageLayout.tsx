import type { ReactNode } from "react";
import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { CoverageGrid } from "../../organisms/CoverageGrid/index.ts";
import { COVERAGE_SOURCE_ID, coverageSource } from "../../organisms/CoverageLensMap/index.ts";
import { CoverageGridLegend } from "../../molecules/CoverageGridLegend/index.ts";
import { FIRST_YEAR } from "../../molecules/FilterChips/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { crawlOnlyCells, explainedCells, firstYearOf, windowActive } from "../../utils/coverageGrid.ts";
import { layout } from "../../../theme/tokens.ts";
import { CoverageSkeleton } from "./components/CoverageSkeleton/index.ts";
import { CrawlOnlyList } from "./components/CrawlOnlyList/index.ts";
import { DataThroughList } from "./components/DataThroughList/index.ts";
import { GapRules } from "./components/GapRules/index.ts";
import { KnownGapsTable } from "./components/KnownGapsTable/index.ts";
import { PerCountyNote } from "./components/PerCountyNote/index.ts";
import { SnapshotLine } from "./components/SnapshotLine/index.ts";
import type { CoveragePageContent, CoveragePageLayoutCopy } from "./coveragePageLayout.types.ts";

const pageSx = { pt: 5, pb: 6, px: layout.gutter, maxWidth: layout.maxWidth, width: "100%", boxSizing: "border-box", mx: "auto" } as const;

export interface CoveragePageLayoutProps {
  status: "loading" | "error" | "ready";
  /** Required when `status` is "ready". */
  content?: CoveragePageContent | undefined;
  locale: Locale;
  /** Where the methodology page lives (the app supplies the locale path). */
  methodologyHref: string;
  /** Where the map's Coverage lens lives (the "N of M" block links to it). */
  lensHref: string;
  onNavigate?: (href: string) => void;
  /** The Source selector (#178), in the grid panel's header strip in every state; absent = none (one Source). */
  sourceSelector?: ReactNode;
  /** The last answer is on screen while the next loads: the data panels dim with `aria-busy` and the grid panel's header shows the loading status. */
  busy?: boolean | undefined;
  /** The failed request's retry: its button label and what it does, inside the grid panel's error note. Absent, the note has no button. */
  retry?: { label: string; onRetry: () => void } | undefined;
  copy: CoveragePageLayoutCopy;
}

/**
 * The Coverage page (`/explore/coverage`): title and intro, then titled panels: the quarter x kind grid with the date range highlighted (the Source selector in its header, the window note and the legend as its foot),
 * the known gaps with the reason or the rule for each, crawl-only counts, data-through per record kind, the rules in words, the MF reference-list snapshot date and the per-county note.
 * It fetches nothing. First load shows the panels as skeletons; an error is one note with its retry in the grid panel (the data panels are left out, the rules stay); a held answer shows dimmed (`busy`).
 */
export function CoveragePageLayout({ status, content, locale, methodologyHref, lensHref, onNavigate, sourceSelector, busy = false, retry, copy }: CoveragePageLayoutProps) {
  const head = (
    <Stack spacing={1.5}>
      <Typography variant="label" component="p" color="primary.main" sx={{ m: 0 }}>{copy.eyebrow}</Typography>
      <Typography variant="h1" component="h1" sx={{ maxWidth: layout.titleMaxWidth, textWrap: "balance" }}>{copy.title}</Typography>
      <Typography variant="lead" sx={{ maxWidth: layout.leadMaxWidth, textWrap: "pretty" }}>{copy.intro}</Typography>
    </Stack>
  );
  const rules = (
    <Panel heading={copy.rules.heading} level="h2" flush>
      <GapRules methodologyHref={methodologyHref} onNavigate={onNavigate} copy={copy} />
    </Panel>
  );
  const selectorAside = (loading: boolean) =>
    sourceSelector != null || loading ? (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1.5 }}>
        {sourceSelector}
        {loading && <LoadingStatus label={copy.loading} />}
      </Box>
    ) : undefined;

  if (status === "loading" || (status === "ready" && !content)) {
    return (
      <Stack component="main" spacing={3} sx={pageSx}>
        {head}
        <CoverageSkeleton copy={copy} gridAside={selectorAside(true)} rules={rules} />
      </Stack>
    );
  }
  if (status === "error" || !content) {
    return (
      <Stack component="main" spacing={3} sx={pageSx}>
        {head}
        <Panel heading={copy.gridHeading} level="h2" aside={selectorAside(false)}>
          <StateNote kind="error" action={retry && <Button size="small" onClick={retry.onRetry}>{retry.label}</Button>}>
            {copy.error}
          </StateNote>
        </Panel>
        {rules}
      </Stack>
    );
  }
  const { cells, sources, referenceSnapshot, dateWindow } = content;
  const crawlOnly = crawlOnlyCells(cells);
  const explained = explainedCells(cells);
  const gridFoot = cells.length === 0 ? undefined : (
    <>
      <CoverageGridLegend copy={copy.grid} showRange={windowActive(dateWindow)} />
      <Typography variant="meta" component="p" sx={{ m: 0 }}>{copy.grid.windowNote}</Typography>
    </>
  );
  return (
    <Stack component="main" spacing={3} sx={pageSx}>
      {head}

      <Panel heading={copy.gridHeading} level="h2" aside={selectorAside(busy)} foot={gridFoot} busy={busy}>
        {cells.length === 0 ? (
          <Typography role="status">{copy.empty}</Typography>
        ) : (
          <Well sx={{ p: 1.5, minWidth: 0 }}>
            <CoverageGrid cells={cells} dateWindow={dateWindow} locale={locale} copy={copy.grid} hideLegend />
          </Well>
        )}
      </Panel>

      <Panel heading={copy.knownGaps.heading} level="h2" aside={copy.knownGaps.count(explained.length)} flush busy={busy}>
        <KnownGapsTable cells={explained} locale={locale} copy={copy} />
      </Panel>

      {crawlOnly.length > 0 && (
        <Panel heading={copy.crawlOnly.heading} level="h2" flush busy={busy}>
          <CrawlOnlyList cells={crawlOnly} locale={locale} copy={copy} />
        </Panel>
      )}

      <Panel heading={copy.dataThrough.heading} level="h2" busy={busy}>
        <DataThroughList sources={sources} locale={locale} copy={copy} />
      </Panel>

      {rules}

      <Panel heading={copy.snapshot.heading} level="h2" busy={busy}>
        <SnapshotLine date={referenceSnapshot} locale={locale} copy={copy} />
      </Panel>

      <Panel heading={copy.perCounty.heading} level="h2" busy={busy}>
        <PerCountyNote lensHref={lensHref} onNavigate={onNavigate} source={coverageSource(sources)?.name ?? COVERAGE_SOURCE_ID} since={String(firstYearOf(cells) ?? FIRST_YEAR)} copy={copy} />
      </Panel>
    </Stack>
  );
}
