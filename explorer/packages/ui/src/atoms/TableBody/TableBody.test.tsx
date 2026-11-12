import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableBody, type TableBodyProps } from "./index.ts";

describe("TableBody", () => {
  it("passes MUI props and sx through", () => {
    renderInUi(<table><TableBody data-testid="b" sx={sxProbe}><tr><td>Cluj</td></tr></TableBody></table>);
    expect(screen.getByTestId("b")).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("cell", { name: "Cluj" })).toBeVisible();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableBodyProps>().toHaveProperty("sx");
    expectTypeOf<TableBodyProps>().toHaveProperty("className");
    // @ts-expect-error not a TableBody prop
    <TableBody nonsense="x" />;
  });
});
