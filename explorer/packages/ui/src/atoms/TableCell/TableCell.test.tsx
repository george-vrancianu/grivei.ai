import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableCell, type TableCellProps } from "./index.ts";

describe("TableCell", () => {
  it("passes MUI props (align, colSpan) and sx through", () => {
    renderInUi(<table><tbody><tr><TableCell align="right" colSpan={2} sx={sxProbe}>1.234,50 RON</TableCell></tr></tbody></table>);
    const cell = screen.getByRole("cell", { name: "1.234,50 RON" });
    expect(cell).toHaveClass("MuiTableCell-alignRight");
    expect(cell).toHaveAttribute("colspan", "2");
    expect(cell).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableCellProps>().toHaveProperty("sx");
    expectTypeOf<TableCellProps>().toHaveProperty("className");
    // @ts-expect-error not a TableCell prop
    <TableCell nonsense="x" />;
  });
});
