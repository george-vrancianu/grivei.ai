import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Grid, type GridProps } from "./index.ts";

describe("Grid", () => {
  it("passes MUI props (container, size) and sx through", () => {
    renderInUi(<Grid container spacing={2} role="group" aria-label="Rețea" sx={sxProbe}><Grid size={6}>a</Grid></Grid>);
    const grid = screen.getByRole("group", { name: "Rețea" });
    expect(grid).toHaveClass("MuiGrid-container");
    expect(grid).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<GridProps>().toHaveProperty("container");
    expectTypeOf<GridProps>().toHaveProperty("sx");
    // @ts-expect-error not a Grid prop
    <Grid nonsense="x" />;
  });
});
