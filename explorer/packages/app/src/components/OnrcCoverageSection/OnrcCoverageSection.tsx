import type { OnrcCoverageQuery } from "@grivei/contract";
import { SnapshotCoverage, Typography, type Locale, type SnapshotCoverageCopy } from "@grivei/ui";

export interface OnrcCoverageSectionProps {
  /** `OnrcCoverage`'s answer; null while it loads or when it failed. */
  coverage: OnrcCoverageQuery | null;
  loading: boolean;
  failed: boolean;
  locale: Locale;
  copy: SnapshotCoverageCopy;
  /** What to say while it loads and when the query failed. */
  status: { loading: string; failed: string };
}

/** ONRC's Coverage, on the lens and on the page: its data-through date and one row per monthly snapshot, a known gap for a month with none. */
export function OnrcCoverageSection({ coverage, loading, failed, locale, copy, status }: OnrcCoverageSectionProps) {
  if (failed) return <Typography role="alert">{status.failed}</Typography>;
  if (loading || coverage === null) return <Typography aria-busy="true">{status.loading}</Typography>;
  const onrc = coverage.sources.find((source) => source.id === "ONRC");
  return <SnapshotCoverage cells={coverage.coverage.grid} dataThrough={onrc?.dataThrough.find((d) => d.kind === "REGISTRATION")} locale={locale} copy={copy} />;
}
