import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { TextField, type TextFieldProps } from "./index.ts";

describe("TextField", () => {
  it("passes MUI props (label, helperText, required) and sx through", () => {
    renderInUi(<TextField label="Autoritate" helperText="Denumirea oficială" required sx={sxProbe} />);
    const input = screen.getByRole("textbox", { name: /Autoritate/ });
    expect(input).toBeRequired();
    expect(screen.getByText("Denumirea oficială")).toBeVisible();
    expect(input.closest(".MuiTextField-root")).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TextFieldProps>().toHaveProperty("label");
    expectTypeOf<TextFieldProps>().toHaveProperty("sx");
    // @ts-expect-error not a TextField prop
    <TextField nonsense="x" />;
  });
});
