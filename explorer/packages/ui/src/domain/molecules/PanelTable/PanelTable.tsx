import type { ReactNode } from "react";
import { Table, type TableProps } from "../../../atoms/Table/index.ts";
import { TableContainer } from "../../../atoms/TableContainer/index.ts";

export interface PanelTableProps extends Omit<TableProps, "aria-label"> {
  /** The scroll region's accessible name (the table's own name stays with `caption` or `aria-label` on a child). */
  label: string;
  /** The table's width below which it scrolls sideways inside its box instead of squeezing its columns (px or any CSS length). Absent, the table fits the box. */
  minWidth?: number | string;
  children: ReactNode;
}

/**
 * A table for a `Panel`'s flush body: the box scrolls sideways by itself (a named, focusable region, at most the panel's width), so a wide table never widens the page,
 * and the table inside takes the theme's treatment (strip-filled head row, 12 px 14 px cells, `raised` row hover with `hover` on the row). Other props go to the `Table`.
 */
export function PanelTable({ label, minWidth, sx, children, ...table }: PanelTableProps) {
  return (
    <TableContainer role="region" tabIndex={0} aria-label={label} sx={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
      <Table {...table} sx={[{ minWidth }, ...(Array.isArray(sx) ? sx : [sx])]}>
        {children}
      </Table>
    </TableContainer>
  );
}
