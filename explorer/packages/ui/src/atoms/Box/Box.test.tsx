import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Box, type BoxProps } from "./index.ts";

describe("Box", () => {
  it("passes MUI props (role, aria-label) and sx through", () => {
    renderInUi(<Box role="region" aria-label="Zonă" sx={{ display: "flex", ...sxProbe }}>x</Box>);
    expect(screen.getByRole("region", { name: "Zonă" })).toHaveStyle({ display: "flex", ...sxProbeStyle });
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<BoxProps>().toHaveProperty("role");
    expectTypeOf<BoxProps>().toHaveProperty("sx");
  });
});
