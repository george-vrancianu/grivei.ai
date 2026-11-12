import { forwardRef } from "react";
import MuiChip, { type ChipProps as MuiChipProps } from "@mui/material/Chip";

export type ChipProps = MuiChipProps;

/** Wraps MUI Chip; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Chip = forwardRef<HTMLDivElement, ChipProps>(function Chip(props, ref) {
  return <MuiChip ref={ref} {...props} />;
}) as typeof MuiChip;
