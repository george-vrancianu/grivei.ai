import { forwardRef } from "react";
import MuiTableRow, { type TableRowProps as MuiTableRowProps } from "@mui/material/TableRow";

export type TableRowProps = MuiTableRowProps;

/** Wraps MUI TableRow; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(props, ref) {
  return <MuiTableRow ref={ref} {...props} />;
}) as typeof MuiTableRow;
