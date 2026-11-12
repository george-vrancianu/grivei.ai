import { forwardRef } from "react";
import MuiTable, { type TableProps as MuiTableProps } from "@mui/material/Table";

export type TableProps = MuiTableProps;

/** Wraps MUI Table; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(props, ref) {
  return <MuiTable ref={ref} {...props} />;
}) as typeof MuiTable;
