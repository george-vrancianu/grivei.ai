import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableRow, type TableRowProps } from "./index.ts";

describe("TableRow", () => {
  it("passes MUI props (hover, selected) and sx through", () => {
    renderInUi(<table><tbody><TableRow hover selected aria-label="Rând" sx={sxProbe}><td>x</td></TableRow></tbody></table>);
    const row = screen.getByRole("row", { name: "Rând" });
    expect(row).toHaveClass("Mui-selected");
    expect(row).toHaveClass("MuiTableRow-hover");
    expect(row).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableRowProps>().toHaveProperty("sx");
    expectTypeOf<TableRowProps>().toHaveProperty("className");
    // @ts-expect-error not a TableRow prop
    <TableRow nonsense="x" />;
  });
});
