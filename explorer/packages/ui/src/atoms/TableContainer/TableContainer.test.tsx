import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TableContainer, type TableContainerProps } from "./index.ts";

describe("TableContainer", () => {
  it("passes MUI props and sx through", () => {
    renderInUi(<TableContainer role="region" aria-label="Defilare" tabIndex={0} sx={sxProbe}>x</TableContainer>);
    const region = screen.getByRole("region", { name: "Defilare" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TableContainerProps>().toHaveProperty("sx");
    expectTypeOf<TableContainerProps>().toHaveProperty("className");
    // @ts-expect-error not a TableContainer prop
    <TableContainer nonsense="x" />;
  });
});
