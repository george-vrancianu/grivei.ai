import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableHead, type TableHeadProps } from "./index.ts";

describe("TableHead", () => {
  it("passes MUI props and sx through", () => {
    renderInUi(<table><TableHead data-testid="h" sx={sxProbe}><tr><th>Autoritate</th></tr></TableHead></table>);
    expect(screen.getByTestId("h")).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("columnheader", { name: "Autoritate" })).toBeVisible();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableHeadProps>().toHaveProperty("sx");
    expectTypeOf<TableHeadProps>().toHaveProperty("className");
    // @ts-expect-error not a TableHead prop
    <TableHead nonsense="x" />;
  });
});
