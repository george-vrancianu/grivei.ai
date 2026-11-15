import type { DataThroughFieldsFragment } from "@grivei/contract";
import { Box, DataThroughDate, Typography, type DataThroughDateCopy, type Locale } from "@grivei/ui";

export interface MainDataThroughProps {
  /** The Sources' "data through" dates; only a harvested Source has any. */
  sources: readonly DataThroughFieldsFragment[];
  copy: { dataThrough: DataThroughDateCopy; kinds: Partial<Record<string, string>> };
  locale: Locale;
}

/** How recent the data is, as a two-column definition list at the foot of the map panel: each record kind, then its date. Renders nothing without dates. */
export function MainDataThrough({ sources, copy, locale }: MainDataThroughProps) {
  const dates = sources.flatMap((source) => source.dataThrough);
  if (dates.length === 0) return null;
  return (
    <Box component="dl" data-testid="main-data-through" sx={{ m: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 16px" }}>
      {dates.map((dataThrough) => (
        <Box key={dataThrough.kind} sx={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
          <Typography variant="caption" component="dt" sx={{ overflowWrap: "anywhere" }}>
            {copy.kinds[dataThrough.kind] ?? dataThrough.kind}
          </Typography>
          <Typography variant="caption" component="dd" color="text.secondary" sx={{ m: 0 }}>
            <DataThroughDate dataThrough={dataThrough} locale={locale} copy={copy.dataThrough} withoutKind />
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
