import type { OnrcCoverageQuery } from "@grivei/contract";
import { Button, LoadingStatus, Skeleton, SnapshotCoverage, Stack, StateNote, type Locale, type SnapshotCoverageCopy } from "@grivei/ui";

export interface OnrcCoverageSectionProps {
  /** `OnrcCoverage`'s answer; null while it loads or when it failed. */
  coverage: OnrcCoverageQuery | null;
  loading: boolean;
  failed: boolean;
  /** Asks the request again; the failure note carries it as a button. */
  onRetry?: (() => void) | undefined;
  locale: Locale;
  copy: SnapshotCoverageCopy;
  /** What to say while it loads, when the query failed and on the retry button. */
  status: { loading: string; failed: string; retry: string };
}

/** ONRC's Coverage, on the lens and on the page: its data-through date and one row per monthly snapshot, a known gap for a month with none. A failure is a note with its retry; the first load is rows of blocks under the status line. */
export function OnrcCoverageSection({ coverage, loading, failed, onRetry, locale, copy, status }: OnrcCoverageSectionProps) {
  if (failed)
    return (
      <StateNote kind="error" action={onRetry && <Button size="small" onClick={onRetry}>{status.retry}</Button>}>
        {status.failed}
      </StateNote>
    );
  if (loading || coverage === null)
    return (
      <Stack spacing={1} aria-busy="true">
        <LoadingStatus label={status.loading} />
        <Stack spacing={1} aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} variant="rounded" height={36} sx={{ opacity: 1 - row * 0.2 }} />
          ))}
        </Stack>
      </Stack>
    );
  const onrc = coverage.sources.find((source) => source.id === "ONRC");
  return <SnapshotCoverage cells={coverage.coverage.grid} dataThrough={onrc?.dataThrough.find((d) => d.kind === "REGISTRATION")} locale={locale} copy={copy} />;
}
