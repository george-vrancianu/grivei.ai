import { forwardRef } from "react";
import MuiCard, { type CardProps as MuiCardProps } from "@mui/material/Card";

export type CardProps = MuiCardProps;

/** Wraps MUI Card; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(props, ref) {
  return <MuiCard ref={ref} {...props} />;
}) as typeof MuiCard;
