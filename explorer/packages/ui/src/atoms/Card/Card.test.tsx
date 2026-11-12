import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Card, type CardProps } from "./index.ts";

describe("Card", () => {
  it("passes MUI props (variant, role) and sx through", () => {
    renderInUi(<Card variant="elevation" role="group" aria-label="Semnal" sx={sxProbe}>Conținut</Card>);
    const card = screen.getByRole("group", { name: "Semnal" });
    expect(card).toHaveClass("MuiPaper-elevation");
    expect(card).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<CardProps>().toHaveProperty("variant");
    expectTypeOf<CardProps>().toHaveProperty("sx");
    // @ts-expect-error not a Card prop
    <Card nonsense="x" />;
  });
});
