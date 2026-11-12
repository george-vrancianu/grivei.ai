import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Button, type ButtonProps } from "./index.ts";

describe("Button", () => {
  it("passes MUI props (disabled, variant) and sx through", () => {
    renderInUi(<Button disabled variant="outlined" sx={sxProbe}>Exportă</Button>);
    const button = screen.getByRole("button", { name: "Exportă" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("MuiButton-outlined");
    expect(button).toHaveStyle(sxProbeStyle);
  });
  it("does not submit a form unless asked to", () => {
    renderInUi(<Button>Caută</Button>);
    expect(screen.getByRole("button", { name: "Caută" })).toHaveAttribute("type", "button");
  });
  it("renders as a link when given an href", () => {
    renderInUi(<Button href="/explore/">Explorează</Button>);
    expect(screen.getByRole("link", { name: "Explorează" })).not.toHaveAttribute("type");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<ButtonProps>().toHaveProperty("variant");
    expectTypeOf<ButtonProps>().toHaveProperty("sx");
    // @ts-expect-error not a Button prop
    <Button nonsense="x" />;
  });
});
