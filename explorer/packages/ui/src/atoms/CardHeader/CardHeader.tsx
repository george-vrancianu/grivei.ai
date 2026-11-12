import { forwardRef } from "react";
import MuiCardHeader, { type CardHeaderProps as MuiCardHeaderProps } from "@mui/material/CardHeader";

export type CardHeaderProps = MuiCardHeaderProps;

/** Wraps MUI CardHeader; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(props, ref) {
  return <MuiCardHeader ref={ref} {...props} />;
}) as typeof MuiCardHeader;
