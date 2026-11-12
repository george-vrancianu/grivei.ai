import type { Locale } from "../../../../../theme/index.ts";
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

/** Each harvested Source's data-through date per record kind. */
export function DataThroughList({ sources, locale, copy }: DataThroughListProps) {
  const harvested = sources.filter((source) => source.harvested && source.dataThrough.length > 0);
  return (
    <>
      <Typography variant="body2" gutterBottom>{copy.dataThrough.intro}</Typography>
      {harvested.length === 0 ? (
        <Typography>{copy.dataThrough.none}</Typography>
      ) : (
        harvested.map((source) => (
          <Box component="ul" key={source.id} aria-label={source.name} sx={{ m: 0, pl: 3 }}>
            {source.dataThrough.map((entry) => (
              <li key={entry.kind}>
                <DataThroughDate dataThrough={entry} locale={locale} copy={copy.dataThrough.copy} kindLabel={kindLabel(entry.kind, copy.grid)} />
              </li>
            ))}
          </Box>
        ))
      )}
    </>
  );
}
