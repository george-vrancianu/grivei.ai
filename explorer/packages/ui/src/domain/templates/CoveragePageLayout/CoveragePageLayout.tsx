import type { Locale } from "../../../theme/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { CoverageGrid } from "../../organisms/CoverageGrid/index.ts";
import { crawlOnlyCells, explainedCells } from "../../utils/coverageGrid.ts";
import { CoverageSection } from "./components/CoverageSection/index.ts";
import { CrawlOnlyList } from "./components/CrawlOnlyList/index.ts";
import { DataThroughList } from "./components/DataThroughList/index.ts";
import { GapRules } from "./components/GapRules/index.ts";
import { KnownGapsTable } from "./components/KnownGapsTable/index.ts";
import { SnapshotLine } from "./components/SnapshotLine/index.ts";
import type { CoveragePageContent, CoveragePageLayoutCopy } from "./coveragePageLayout.types.ts";

export interface CoveragePageLayoutProps {
  status: "loading" | "error" | "ready";
  /** Required when `status` is "ready". */
  content?: CoveragePageContent | undefined;
  locale: Locale;
  /** Where the methodology page lives (the app supplies the locale path). */
  methodologyHref: string;
  onNavigate?: (href: string) => void;
  copy: CoveragePageLayoutCopy;
}

/**
 * The Coverage page (`/explore/coverage`): title and intro, the quarter x kind grid with the date range highlighted, data-through per record kind,
 * crawl-only counts, the list of known gaps with the reason or the rule for each, the rules in words, and the MF reference-list snapshot date.
 * It fetches nothing; loading, error and an empty grid are states of the same page.
 */
export function CoveragePageLayout({ status, content, locale, methodologyHref, onNavigate, copy }: CoveragePageLayoutProps) {
  const head = (
    <>
      <Typography variant="h4" component="h1">{copy.title}</Typography>
      <Typography>{copy.intro}</Typography>
    </>
  );
  if (status === "loading" || status === "error" || !content) {
    return (
      <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        {head}
        {status === "error" ? <Typography role="alert">{copy.error}</Typography> : <Typography role="status">{copy.loading}</Typography>}
      </Stack>
    );
  }
  const { cells, sources, referenceSnapshot, dateWindow } = content;
  const crawlOnly = crawlOnlyCells(cells);
  return (
    <Stack component="main" spacing={4} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Stack spacing={1}>{head}</Stack>

      <CoverageSection title={copy.gridHeading}>
        {cells.length === 0 ? <Typography role="status">{copy.empty}</Typography> : <CoverageGrid cells={cells} dateWindow={dateWindow} locale={locale} copy={copy.grid} />}
      </CoverageSection>

      <CoverageSection title={copy.dataThrough.heading}>
        <DataThroughList sources={sources} locale={locale} copy={copy} />
      </CoverageSection>

      {crawlOnly.length > 0 && (
        <CoverageSection title={copy.crawlOnly.heading}>
          <CrawlOnlyList cells={crawlOnly} locale={locale} copy={copy} />
        </CoverageSection>
      )}

      <CoverageSection title={copy.knownGaps.heading}>
        <KnownGapsTable cells={explainedCells(cells)} locale={locale} copy={copy} />
      </CoverageSection>

      <CoverageSection title={copy.rules.heading}>
        <GapRules methodologyHref={methodologyHref} onNavigate={onNavigate} copy={copy} />
      </CoverageSection>

      <CoverageSection title={copy.snapshot.heading}>
        <SnapshotLine date={referenceSnapshot} locale={locale} copy={copy} />
      </CoverageSection>
    </Stack>
  );
}
