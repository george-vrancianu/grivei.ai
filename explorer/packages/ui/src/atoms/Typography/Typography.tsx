import { forwardRef } from "react";
import MuiTypography, { type TypographyProps as MuiTypographyProps } from "@mui/material/Typography";

export type TypographyProps = MuiTypographyProps;

/** Wraps MUI Typography; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Typography = forwardRef<HTMLElement, TypographyProps>(function Typography(props, ref) {
  return <MuiTypography ref={ref} {...props} />;
}) as typeof MuiTypography;
