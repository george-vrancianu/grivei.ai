import { forwardRef } from "react";
import MuiBox, { type BoxProps as MuiBoxProps } from "@mui/material/Box";
import { color, radius, shadow } from "../../theme/tokens.ts";

export interface WellProps extends MuiBoxProps {
  /** The border: `line` (map, figures) or `lineStrong` (an input, a segmented control's track). */
  edge?: "line" | "lineStrong";
}

/**
 * An inset area: the ground colour, a hairline and the `well` shadow, so it reads as sunk into the panel it sits on
 * (a map, a secondary figure). Layout and padding come from the caller's `sx`, which is merged last (so it can override the radius, as `SegmentedTrack` does); leave the fill, border and shadow to the Well.
 */
export const Well = forwardRef<HTMLElement, WellProps>(function Well({ edge = "line", sx, ...props }, ref) {
  const base = { backgroundColor: color.bg, border: `1px solid ${color[edge]}`, borderRadius: `${radius.card}px`, boxShadow: shadow.well };
  return <MuiBox ref={ref} sx={[base, ...(Array.isArray(sx) ? sx : [sx])]} {...props} />;
});
