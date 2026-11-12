import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { CountyCoverage, CoverageLens } from "../../../../types.ts";
import type { CoverageLensMapCopy } from "../../coverageLensMap.types.ts";
import { coverageSource, sinceText, summaryParts } from "../../coverageLensMap.utils.ts";

export interface CoverageFiguresProps {
  /** The area's coverage row, or undefined when the coverage has none for it. */
  row: CountyCoverage | undefined;
  lens: Pick<CoverageLens, "sources"> & { coverage: Pick<CoverageLens["coverage"], "window"> };
  /** Adds the "may simply have bought nothing" note (the tooltip does, the tiles do not). */
  withNote?: boolean;
  locale: Locale;
  copy: Pick<CoverageLensMapCopy, "status" | "noStatus" | "tooltip">;
}

/** An area's coverage as lines: its status word, then "N of M public entities have SEAP records since <date>, plus K other contracting authorities", then the note. */
export function CoverageFigures({ row, lens, withNote = false, locale, copy }: CoverageFiguresProps) {
  if (!row) return <Typography component="span" variant="body2" sx={{ display: "block" }}>{copy.noStatus}</Typography>;
  const source = coverageSource(lens.sources)?.name ?? "SEAP";
  const parts = summaryParts(row, source, sinceText(lens.coverage.window, locale), locale);
  return (
    <>
      <Typography component="span" variant="body2" sx={{ display: "block", fontWeight: 600 }}>{copy.status[row.status]}</Typography>
      <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.tooltip.summary(parts)}</Typography>
      {withNote && <Typography component="span" variant="caption" sx={{ display: "block", fontStyle: "italic" }}>{copy.tooltip.boughtNothingNote}</Typography>}
    </>
  );
}
