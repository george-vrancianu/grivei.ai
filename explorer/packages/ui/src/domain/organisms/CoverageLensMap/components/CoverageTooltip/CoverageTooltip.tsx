import { Typography } from "../../../../../atoms/Typography/index.ts";
import { mapTooltipName } from "../../../BaseMap/index.ts";
import { CoverageFigures, type CoverageFiguresProps } from "../CoverageFigures/index.ts";

export interface CoverageTooltipProps extends Omit<CoverageFiguresProps, "withNote" | "dense"> {
  name: string;
}

/** What the map's tooltip says about a county: its name, status, the N of M sentence and the note that an entity without records may simply have bought nothing. */
export function CoverageTooltip({ name, ...figures }: CoverageTooltipProps) {
  return (
    <>
      <Typography component="span" {...mapTooltipName}>{name}</Typography>
      <CoverageFigures {...figures} withNote dense />
    </>
  );
}
