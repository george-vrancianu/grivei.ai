import { forwardRef } from "react";
import { Chip, type ChipProps } from "../../../atoms/Chip/index.ts";
import { color } from "../../../theme/tokens.ts";
import { SignalMark } from "../../atoms/SignalMark/index.ts";

export type SignalChipProps = Omit<ChipProps<"a">, "component" | "clickable" | "size" | "variant" | "icon" | "href"> & {
  /** Where the chip leads. */
  href: string;
};

/**
 * The one look of a Signal chip: a small outlined link chip with the amber ring (`SignalMark`) and the Signal line colour, never red, no score.
 * `SignalBadge` (a Signal's rule and date) and `SignalCountChip` ("n Signals") both render it, so the two cannot drift. Other props
 * (`label`, `onClick`, and the ones a Tooltip adds) pass through to the Chip.
 */
export const SignalChip = forwardRef<HTMLAnchorElement, SignalChipProps>(function SignalChip({ sx, ...props }, ref) {
  return (
    <Chip
      ref={ref}
      component="a"
      clickable
      size="small"
      variant="outlined"
      icon={<SignalMark size="small" />}
      sx={[
        (theme) => ({
          borderColor: color.signalLine,
          color: color.accent,
          "&.MuiChip-root .MuiChip-icon": { color: "inherit", ml: theme.spacing(1), mr: theme.spacing(-0.5) },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
});
