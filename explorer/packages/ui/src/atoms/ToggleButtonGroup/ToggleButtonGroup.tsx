import { forwardRef } from "react";
import MuiToggleButtonGroup, { type ToggleButtonGroupProps as MuiToggleButtonGroupProps } from "@mui/material/ToggleButtonGroup";

export type ToggleButtonGroupProps = MuiToggleButtonGroupProps;

/** Wraps MUI ToggleButtonGroup: a bordered strip of toggle segments. Every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const ToggleButtonGroup = forwardRef<HTMLDivElement, ToggleButtonGroupProps>(function ToggleButtonGroup(props, ref) {
  return <MuiToggleButtonGroup ref={ref} {...props} />;
}) as typeof MuiToggleButtonGroup;
