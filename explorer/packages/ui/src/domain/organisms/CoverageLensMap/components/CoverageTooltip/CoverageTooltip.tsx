import { Typography } from "../../../../../atoms/Typography/index.ts";
import { CoverageFigures, type CoverageFiguresProps } from "../CoverageFigures/index.ts";

export interface CoverageTooltipProps extends Omit<CoverageFiguresProps, "withNote"> {
  name: string;
}

/** What the map's tooltip says about a county: its name, status, the N of M sentence and the note that an entity without records may simply have bought nothing. */
export function CoverageTooltip({ name, ...figures }: CoverageTooltipProps) {
  return (
    <>
      <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{name}</Typography>
      <CoverageFigures {...figures} withNote />
    </>
  );
}
