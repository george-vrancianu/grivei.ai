import { LinearProgress } from "../../../../../atoms/LinearProgress/index.ts";
import { color, radius, size } from "../../../../../theme/tokens.ts";
import { shareBarPercent } from "../../entityOverview.utils.ts";

export interface ShareBarProps {
  /** A share of the total, 0 to 1; null (no total to share) draws an empty track. */
  share: number | null;
}

/** A concentration bar: the share of the total as an accent fill on a `line` track. Decoration only (`aria-hidden`): the share is also written as text beside it. */
export function ShareBar({ share }: ShareBarProps) {
  return (
    <LinearProgress
      variant="determinate"
      value={shareBarPercent(share)}
      aria-hidden="true"
      sx={{ height: size.bar, borderRadius: `${radius.cell}px`, bgcolor: color.line, "& .MuiLinearProgress-bar": { bgcolor: color.accent, borderRadius: `${radius.cell}px` } }}
    />
  );
}
