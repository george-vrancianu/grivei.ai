import { Box } from "../../../atoms/Box/index.ts";
import { color } from "../../../theme/tokens.ts";

export interface SignalMarkProps {
  /** `large` (12 px) leads a Signal card's heading; `small` (8 px) sits in a Signal chip. */
  size?: "small" | "large";
}

const SIZES = { small: { box: 8, ring: 2 }, large: { box: 12, ring: 3 } } as const;

/** The amber ring that marks a Signal: a hollow circle, never red and never filled (a Signal is a count, not a verdict). Decorative: the label beside it says what it is. */
export function SignalMark({ size = "large" }: SignalMarkProps) {
  const { box, ring } = SIZES[size];
  return <Box component="span" aria-hidden="true" data-signal-mark sx={{ flex: "none", boxSizing: "border-box", width: box, height: box, borderRadius: "50%", border: `${ring}px solid ${color.accent}` }} />;
}
