import { forwardRef } from "react";
import MuiGrid, { type GridProps as MuiGridProps } from "@mui/material/Grid";

export type GridProps = MuiGridProps;

/** Wraps MUI Grid; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(props, ref) {
  return <MuiGrid ref={ref} {...props} />;
}) as typeof MuiGrid;
