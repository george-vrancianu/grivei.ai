import { forwardRef } from "react";
import { TableCell, type TableCellProps } from "../../../atoms/TableCell/index.ts";
import { font } from "../../../theme/tokens.ts";

export type NumericCellProps = TableCellProps;

const numericSx = { fontFamily: font.mono, fontVariantNumeric: "tabular-nums" } as const;

/**
 * A table cell for a number, in the head or the body: right-aligned, Plex Mono, tabular figures (digits line up down the column). The size and colour come from the theme's cell
 * (a head cell stays 12 px muted, a body cell 14 px). Every `TableCell` prop, `sx` and ref passes through; `align` can be set but defaults to right.
 */
export const NumericCell = forwardRef<HTMLTableCellElement, NumericCellProps>(function NumericCell({ sx, ...props }, ref) {
  return <TableCell ref={ref} align="right" {...props} sx={[numericSx, ...(Array.isArray(sx) ? sx : [sx])]} />;
});
