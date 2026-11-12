import { forwardRef } from "react";
import MuiLinearProgress, { type LinearProgressProps as MuiLinearProgressProps } from "@mui/material/LinearProgress";

export type LinearProgressProps = MuiLinearProgressProps;

/** Wraps MUI LinearProgress; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const LinearProgress = forwardRef<HTMLSpanElement, LinearProgressProps>(function LinearProgress(props, ref) {
  return <MuiLinearProgress ref={ref} {...props} />;
});
