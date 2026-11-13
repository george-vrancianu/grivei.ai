import type { Locale } from "../../../theme/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { CoverageGrid } from "../../organisms/CoverageGrid/index.ts";
import { crawlOnlyCells, explainedCells } from "../../utils/coverageGrid.ts";
import { layout } from "../../../theme/tokens.ts";
import { CoverageSection } from "./components/CoverageSection/index.ts";
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
  copy: CoveragePageLayoutCopy;
}

/**
 * The Coverage page (`/explore/coverage`): title and intro, the quarter x kind grid with the date range highlighted, data-through per record kind,
 * crawl-only counts, the list of known gaps with the reason or the rule for each, the rules in words, and the MF reference-list snapshot date.
 * It fetches nothing; loading, error and an empty grid are states of the same page.
 */
export function CoveragePageLayout({ status, content, locale, methodologyHref, lensHref, onNavigate, copy }: CoveragePageLayoutProps) {
  const head = (
    <>
      <Typography variant="label" component="p" color="primary.main" sx={{ m: 0 }}>{copy.eyebrow}</Typography>
      <Typography variant="h1" component="h1" sx={{ maxWidth: layout.titleMaxWidth, textWrap: "balance" }}>{copy.title}</Typography>
      <Typography variant="lead" sx={{ maxWidth: layout.leadMaxWidth, textWrap: "pretty" }}>{copy.intro}</Typography>
    </>
  );
  if (status === "loading" || status === "error" || !content) {
    return (
      <Stack component="main" spacing={2} sx={pageSx}>
        {head}
        {status === "error" ? <Typography role="alert">{copy.error}</Typography> : <Typography role="status">{copy.loading}</Typography>}
      </Stack>
    );
  }
  const { cells, sources, referenceSnapshot, dateWindow } = content;
  const crawlOnly = crawlOnlyCells(cells);
  return (
    <Stack component="main" spacing={4.5} sx={pageSx}>
      <Stack spacing={1.5}>{head}</Stack>

      <CoverageSection title={copy.gridHeading}>
        {cells.length === 0 ? <Typography role="status">{copy.empty}</Typography> : <CoverageGrid cells={cells} dateWindow={dateWindow} locale={locale} copy={copy.grid} />}
      </CoverageSection>

      <CoverageSection title={copy.knownGaps.heading}>
        <KnownGapsTable cells={explainedCells(cells)} locale={locale} copy={copy} />
      </CoverageSection>

      {crawlOnly.length > 0 && (
        <CoverageSection title={copy.crawlOnly.heading}>
          <CrawlOnlyList cells={crawlOnly} locale={locale} copy={copy} />
        </CoverageSection>
      )}

      <CoverageSection title={copy.dataThrough.heading}>
        <DataThroughList sources={sources} locale={locale} copy={copy} />
      </CoverageSection>

      <CoverageSection title={copy.rules.heading}>
        <GapRules methodologyHref={methodologyHref} onNavigate={onNavigate} copy={copy} />
      </CoverageSection>

      <CoverageSection title={copy.snapshot.heading}>
        <SnapshotLine date={referenceSnapshot} locale={locale} copy={copy} />
      </CoverageSection>

      <PerCountyNote lensHref={lensHref} onNavigate={onNavigate} copy={copy} />
    </Stack>
  );
}
