import type { DataThroughFieldsFragment } from "@grivei/contract";
import { DataThroughDate, Stack, Typography, type DataThroughDateCopy, type Locale } from "@grivei/ui";

export interface MainDataThroughProps {
  /** The Sources' "data through" dates; only a harvested Source has any. */
  sources: readonly DataThroughFieldsFragment[];
  copy: { dataThrough: DataThroughDateCopy; kinds: Partial<Record<string, string>> };
  locale: Locale;
}

/** How recent the data is, one line per record kind: the note at the foot of the map panel, as in the design. Renders nothing without dates. */
export function MainDataThrough({ sources, copy, locale }: MainDataThroughProps) {
  const dates = sources.flatMap((source) => source.dataThrough);
  if (dates.length === 0) return null;
  return (
    <Stack spacing={0.5} data-testid="main-data-through">
      {dates.map((dataThrough) => (
        <Typography key={dataThrough.kind} variant="caption" color="text.secondary" component="p">
          <DataThroughDate dataThrough={dataThrough} locale={locale} copy={copy.dataThrough} kindLabel={copy.kinds[dataThrough.kind] ?? dataThrough.kind} />
        </Typography>
      ))}
    </Stack>
  );
}
