import { forwardRef } from "react";
import MuiTableCell, { type TableCellProps as MuiTableCellProps } from "@mui/material/TableCell";

export type TableCellProps = MuiTableCellProps;

/** Wraps MUI TableCell; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(props, ref) {
  return <MuiTableCell ref={ref} {...props} />;
}) as typeof MuiTableCell;
