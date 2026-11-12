import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { IconButton, type IconButtonProps } from "./index.ts";

describe("IconButton", () => {
  it("passes MUI props (disabled, size) and sx through, and is named by its label", () => {
    renderInUi(<IconButton aria-label="Închide" disabled size="large" sx={sxProbe}>x</IconButton>);
    const button = screen.getByRole("button", { name: "Închide" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("MuiIconButton-sizeLarge");
    expect(button).toHaveStyle(sxProbeStyle);
  });
  it("requires an accessible label at the type level", () => {
    expectTypeOf<IconButtonProps["aria-label"]>().toEqualTypeOf<string>();
    // @ts-expect-error aria-label is required
    <IconButton>x</IconButton>;
  });
});
