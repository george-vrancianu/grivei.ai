import { LinearProgress } from "../../../atoms/LinearProgress/index.ts";
import { color } from "../../../theme/tokens.ts";

export interface RequestBarProps {
  /** Whether any request is in flight; the bar is drawn only then. */
  busy: boolean;
}

/**
 * The thin indeterminate bar for requests in flight (accent on a `line` track, 2 px). Place it inside the sticky header: from `md` up it sits on
 * the header's bottom edge (the header is its containing block); below `md`, where the header scrolls away, it is fixed at the top of the viewport.
 * Decoration only (`aria-hidden`, no label): the status lines carry the meaning. It stops animating under `prefers-reduced-motion` (theme `motion`).
 */
export function RequestBar({ busy }: RequestBarProps) {
  if (!busy) return null;
  return (
    <LinearProgress
      aria-hidden="true"
      sx={(theme) => ({
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: theme.zIndex.modal + 1,
        bgcolor: color.line,
        "& .MuiLinearProgress-bar": { bgcolor: color.accent },
        [theme.breakpoints.up("md")]: { position: "absolute", top: "auto", bottom: -2 },
      })}
    />
  );
}
