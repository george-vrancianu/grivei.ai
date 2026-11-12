import { forwardRef } from "react";
import MuiTableBody, { type TableBodyProps as MuiTableBodyProps } from "@mui/material/TableBody";

export type TableBodyProps = MuiTableBodyProps;

/** Wraps MUI TableBody; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody(props, ref) {
  return <MuiTableBody ref={ref} {...props} />;
}) as typeof MuiTableBody;
