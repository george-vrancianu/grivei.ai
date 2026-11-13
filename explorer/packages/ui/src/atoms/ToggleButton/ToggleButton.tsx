import { forwardRef } from "react";
import MuiToggleButton, { type ToggleButtonProps as MuiToggleButtonProps } from "@mui/material/ToggleButton";

export type ToggleButtonProps = MuiToggleButtonProps;

/** Wraps MUI ToggleButton (a toggle segment, 36 px; selected = filled with an accent outline). Every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(props, ref) {
  return <MuiToggleButton ref={ref} {...props} />;
}) as typeof MuiToggleButton;
