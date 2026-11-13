import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { CountyCoverage, CoverageLens } from "../../../../types.ts";
import { mapTooltipLine, mapTooltipName } from "../../../BaseMap/index.ts";
import type { CoverageLensMapCopy } from "../../coverageLensMap.types.ts";
import { COVERAGE_SOURCE_ID, coverageSource, sinceText, summaryParts } from "../../coverageLensMap.utils.ts";

export interface CoverageFiguresProps {
  /** The area's coverage row, or undefined when the coverage has none for it. */
  row: CountyCoverage | undefined;
  lens: Pick<CoverageLens, "sources"> & { coverage: Pick<CoverageLens["coverage"], "window"> };
  /** Adds the "may simply have bought nothing" note (the tooltip does, the tiles do not). */
  withNote?: boolean;
  /** The map tooltip's treatment: every line in the `meta` variant (the status in `text`, 600; the rest `text2`). */
  dense?: boolean;
  locale: Locale;
  copy: Pick<CoverageLensMapCopy, "status" | "noStatus" | "tooltip">;
}

/** An area's coverage as lines: its status word, then "N of M public entities have SEAP records since <date>, plus K other contracting authorities", then the note. */
export function CoverageFigures({ row, lens, withNote = false, dense = false, locale, copy }: CoverageFiguresProps) {
  const line = dense ? mapTooltipLine : ({ variant: "caption", sx: { display: "block" } } as const);
  const noStatusProps = dense ? mapTooltipLine : ({ variant: "body2", sx: { display: "block" } } as const);
  const statusProps = dense ? mapTooltipName : ({ variant: "body2", sx: { display: "block", fontWeight: 600 } } as const);
  if (!row) return <Typography component="span" {...noStatusProps}>{copy.noStatus}</Typography>;
  const source = coverageSource(lens.sources)?.name ?? COVERAGE_SOURCE_ID;
  const parts = summaryParts(row, source, sinceText(lens.coverage.window, locale), locale);
  return (
    <>
      <Typography component="span" {...statusProps}>{copy.status[row.status]}</Typography>
      <Typography component="span" {...line}>{copy.tooltip.summary(parts)}</Typography>
      {withNote && <Typography component="span" {...line} sx={{ ...line.sx, fontStyle: "italic" }}>{copy.tooltip.boughtNothingNote}</Typography>}
    </>
  );
}
