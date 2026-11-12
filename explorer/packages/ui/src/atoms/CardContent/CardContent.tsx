import { forwardRef } from "react";
import MuiCardContent, { type CardContentProps as MuiCardContentProps } from "@mui/material/CardContent";

export type CardContentProps = MuiCardContentProps;

/** Wraps MUI CardContent; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(props, ref) {
  return <MuiCardContent ref={ref} {...props} />;
}) as typeof MuiCardContent;
