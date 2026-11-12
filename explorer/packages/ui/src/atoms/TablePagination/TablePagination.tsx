import { forwardRef } from "react";
import MuiTablePagination, { type TablePaginationProps as MuiTablePaginationProps } from "@mui/material/TablePagination";

export type TablePaginationProps = MuiTablePaginationProps;

/** Wraps MUI TablePagination; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TablePagination = forwardRef<HTMLDivElement, TablePaginationProps>(function TablePagination(props, ref) {
  return <MuiTablePagination ref={ref} {...props} />;
}) as typeof MuiTablePagination;
