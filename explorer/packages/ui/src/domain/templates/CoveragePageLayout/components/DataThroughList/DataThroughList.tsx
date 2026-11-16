import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { DataThroughDate } from "../../../../atoms/DataThroughDate/index.ts";
import type { SourceInfo } from "../../../../types.ts";
import { kindLabel } from "../../../../utils/coverageGrid.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface DataThroughListProps {
  sources: readonly SourceInfo[];
  locale: Locale;
  copy: CoveragePageLayoutCopy;
}

/** The body of the Data through panel: the intro, then per harvested Source a list with one inset figure per record kind (the kind over its date). */
export function DataThroughList({ sources, locale, copy }: DataThroughListProps) {
  const harvested = sources.filter((source) => source.harvested && source.dataThrough.length > 0);
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>{copy.dataThrough.intro}</Typography>
      {harvested.length === 0 ? (
        <Typography>{copy.dataThrough.none}</Typography>
      ) : (
        harvested.map((source) => (
          <Box component="ul" key={source.id} aria-label={source.name} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {source.dataThrough.map((entry) => (
              <Box component="li" key={entry.kind} sx={{ display: "flex", flex: "1 1 200px", minWidth: 0 }}>
                <InsetFigure label={kindLabel(entry.kind, copy.grid)}>
                  <DataThroughDate dataThrough={entry} locale={locale} copy={copy.dataThrough.copy} withoutKind />
                </InsetFigure>
              </Box>
            ))}
          </Box>
        ))
      )}
    </>
  );
}
