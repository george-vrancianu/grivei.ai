import type { ReactNode } from "react";
import { Well } from "../../../atoms/Well/index.ts";
import { radius } from "../../../theme/tokens.ts";

export interface SegmentedTrackProps {
  /** The segmented control's `ToggleButtonGroup`, with its buttons directly inside it. */
  children: ReactNode;
}

/**
 * The track of a segmented control: a `Well` (ground fill, `lineStrong` edge, inset shadow) at the control radius, as wide as its segments.
 * The group's own border is switched off so the track is the only edge. It adds no element between the group and its buttons, so the roving focus is unchanged.
 * Shared by `OptionToggle` and `SourcePicker`.
 */
export function SegmentedTrack({ children }: SegmentedTrackProps) {
  return (
    <Well edge="lineStrong" sx={{ display: "flex", width: "fit-content", maxWidth: "100%", borderRadius: `${radius.control}px`, "& .MuiToggleButtonGroup-root": { border: 0 } }}>
      {children}
    </Well>
  );
}
