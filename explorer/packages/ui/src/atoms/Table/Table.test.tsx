import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableCell } from "../TableCell/index.ts";
import { Table, type TableProps } from "./index.ts";

describe("Table", () => {
  it("passes MUI props (size, aria-label) and sx through", () => {
    renderInUi(<Table size="medium" aria-label="Contracte" sx={sxProbe}><tbody><tr><TableCell>x</TableCell></tr></tbody></Table>);
    const table = screen.getByRole("table", { name: "Contracte" });
    expect(screen.getByRole("cell")).toHaveClass("MuiTableCell-sizeMedium");
    expect(table).toHaveStyle(sxProbeStyle);
  });
  it("defaults to the compact size from the theme", () => {
    renderInUi(<Table aria-label="Contracte"><tbody><tr><TableCell>x</TableCell></tr></tbody></Table>);
    expect(screen.getByRole("cell")).toHaveClass("MuiTableCell-sizeSmall");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableProps>().toHaveProperty("sx");
    expectTypeOf<TableProps>().toHaveProperty("className");
    // @ts-expect-error not a Table prop
    <Table nonsense="x" />;
  });
});
