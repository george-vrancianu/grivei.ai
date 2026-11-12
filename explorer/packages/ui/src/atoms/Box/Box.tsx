import { forwardRef } from "react";
import MuiBox, { type BoxProps as MuiBoxProps } from "@mui/material/Box";

export type BoxProps = MuiBoxProps;

/** Wraps MUI Box; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Box = forwardRef<HTMLElement, BoxProps>(function Box(props, ref) {
  return <MuiBox ref={ref} {...props} />;
}) as typeof MuiBox;
