import { color } from "../../../../../theme/tokens.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { CoverageFigures, type CoverageFiguresProps } from "../CoverageFigures/index.ts";

export interface CoverageTooltipProps extends Omit<CoverageFiguresProps, "withNote" | "dense"> {
  name: string;
}

/** What the map's tooltip says about a county: its name, status, the N of M sentence and the note that an entity without records may simply have bought nothing. */
export function CoverageTooltip({ name, ...figures }: CoverageTooltipProps) {
  return (
    <>
      <Typography component="span" variant="meta" sx={{ display: "block", color: color.text, fontWeight: 600 }}>{name}</Typography>
      <CoverageFigures {...figures} withNote dense />
    </>
  );
}
