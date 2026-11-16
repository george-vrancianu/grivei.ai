import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { color, radius, shadow } from "../../../../../theme/tokens.ts";
import { SignalMark } from "../../../../atoms/SignalMark/index.ts";
import { SwitchTrack } from "./components/SwitchTrack/index.ts";

export interface HasSignalsChipProps {
  /** The filter's `hasSignals`: only `true` shows as on; `false` is the active-chip row's business. */
  hasSignals: boolean | null | undefined;
  onToggle: () => void;
  copy: FilterChipsCopy["signals"];
}

/** The raised shadow without its inset top highlight, as the drawing's on state has it. */
const ON_SHADOW = shadow.raised.split(", ").slice(1).join(", ");

/**
 * The Signals switch, first in the filter bar: "Has Signals" with the amber ring and a switch track, on (`true`) or unset.
 * Still a toggle button with `aria-pressed`. Off: raised fill, Signal-line border. On: amber tint and accent border, no halo.
 */
export function HasSignalsChip({ hasSignals, onToggle, copy }: HasSignalsChipProps) {
  const on = hasSignals === true;
  return (
    <Button
      variant="outlined"
      aria-pressed={on}
      onClick={onToggle}
      sx={{
        gap: "10px",
        padding: "0 8px 0 14px",
        borderRadius: `${radius.menuButton}px`,
        borderColor: color.signalLine,
        fontWeight: 600,
        textTransform: "none",
        whiteSpace: "nowrap",
        color: color.text,
        // The theme's shared selected treatment (line fill, inset ring) is for other toggles: the switch's on state is the tint and the accent border.
        "&.MuiButton-root[aria-pressed='true'], &.MuiButton-root[aria-pressed='true']:hover": {
          backgroundColor: color.accentTint,
          borderColor: color.accent,
          boxShadow: ON_SHADOW,
          color: color.text,
        },
      }}
    >
      <SignalMark />
      <span>{copy.has}</span>
      <SwitchTrack on={on} />
    </Button>
  );
}
