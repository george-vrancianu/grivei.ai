import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Typography, type TypographyProps } from "./index.ts";

describe("Typography", () => {
  it("passes MUI props (variant, component) and sx through", () => {
    renderInUi(<Typography variant="h3" component="h2" sx={sxProbe}>Autorități contractante</Typography>);
    const heading = screen.getByRole("heading", { level: 2, name: "Autorități contractante" });
    expect(heading).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TypographyProps>().toHaveProperty("variant");
    expectTypeOf<TypographyProps>().toHaveProperty("sx");
    // @ts-expect-error not a Typography prop
    <Typography nonsense="x" />;
  });
});
