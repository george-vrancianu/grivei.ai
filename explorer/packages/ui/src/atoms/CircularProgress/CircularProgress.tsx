import { forwardRef } from "react";
import MuiCircularProgress, { type CircularProgressProps as MuiCircularProgressProps } from "@mui/material/CircularProgress";

export type CircularProgressProps = MuiCircularProgressProps;

/** Wraps MUI CircularProgress; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const CircularProgress = forwardRef<HTMLSpanElement, CircularProgressProps>(function CircularProgress(props, ref) {
  return <MuiCircularProgress ref={ref} {...props} />;
});
