import type { Locale } from "../../../../../theme/index.ts";
import { radius } from "../../../../../theme/tokens.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { DataThroughDate } from "../../../../atoms/DataThroughDate/index.ts";
import type { SourceInfo } from "../../../../types.ts";
import { kindLabel } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface DataThroughListProps {
  sources: readonly SourceInfo[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** A card per record kind: the kind and "data through" as a mono line, the date big under it (the wording is one sentence in the markup). */
const dataThroughCardSx = {
  p: 2,
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: `${radius.card}px`,
  "& > span": { typography: "meta", display: "block" },
  "& time": { display: "block", mt: 0.5, typography: "h3", color: "text.primary" },
} as const;

/** Each harvested Source's data-through date per record kind. */
export function DataThroughList({ sources, locale, copy }: DataThroughListProps) {
  const harvested = sources.filter((source) => source.harvested && source.dataThrough.length > 0);
  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>{copy.dataThrough.intro}</Typography>
      {harvested.length === 0 ? (
        <Typography>{copy.dataThrough.none}</Typography>
      ) : (
        harvested.map((source) => (
          <Box component="ul" key={source.id} aria-label={source.name} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
            {source.dataThrough.map((entry) => (
              <Box component="li" key={entry.kind} sx={dataThroughCardSx}>
                <DataThroughDate dataThrough={entry} locale={locale} copy={copy.dataThrough.copy} kindLabel={kindLabel(entry.kind, copy.grid)} />
              </Box>
            ))}
          </Box>
        ))
      )}
    </>
  );
}
