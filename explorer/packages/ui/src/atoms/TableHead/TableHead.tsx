import { forwardRef } from "react";
import MuiTableHead, { type TableHeadProps as MuiTableHeadProps } from "@mui/material/TableHead";

export type TableHeadProps = MuiTableHeadProps;

/** Wraps MUI TableHead; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(function TableHead(props, ref) {
  return <MuiTableHead ref={ref} {...props} />;
}) as typeof MuiTableHead;
