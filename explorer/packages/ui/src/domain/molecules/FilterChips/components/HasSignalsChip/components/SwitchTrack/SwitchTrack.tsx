import { Box } from "../../../../../../../atoms/Box/index.ts";
import { color } from "../../../../../../../theme/tokens.ts";

export interface SwitchTrackProps {
  on: boolean;
}

/** The 34 by 20 px track and 14 px knob of the Signals switch. Decoration (`aria-hidden`): the button's `aria-pressed` carries the state. The knob slides in 120 ms, and not at all under `prefers-reduced-motion`. */
export function SwitchTrack({ on }: SwitchTrackProps) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      data-switch-track
      sx={{
        flex: "none",
        position: "relative",
        width: 34,
        height: 20,
        borderRadius: "10px",
        backgroundColor: on ? color.accent : color.lineStrong,
        transition: "background-color 120ms ease",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Box
        component="span"
        data-switch-knob
        sx={{
          position: "absolute",
          top: 3,
          left: on ? 17 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: on ? color.bg : color.text2,
          transition: "left 120ms ease",
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      />
    </Box>
  );
}
