import { forwardRef } from "react";
import MuiTableContainer, { type TableContainerProps as MuiTableContainerProps } from "@mui/material/TableContainer";

export type TableContainerProps = MuiTableContainerProps;

/** Wraps MUI TableContainer; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(function TableContainer(props, ref) {
  return <MuiTableContainer ref={ref} {...props} />;
}) as typeof MuiTableContainer;
