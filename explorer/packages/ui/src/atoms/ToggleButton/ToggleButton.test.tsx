import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { ToggleButton, type ToggleButtonProps } from "./index.ts";

describe("ToggleButton", () => {
  it("passes MUI props (selected, onChange, disabled) and sx through", async () => {
    const onChange = vi.fn();
    renderInUi(
      <>
        <ToggleButton value="a" selected onChange={onChange} sx={sxProbe}>Authority</ToggleButton>
        <ToggleButton value="b" disabled>Supplier</ToggleButton>
      </>,
    );
    const on = screen.getByRole("button", { name: "Authority" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(on).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("button", { name: "Supplier" })).toBeDisabled();
    await userEvent.click(on);
    expect(onChange).toHaveBeenCalled();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<ToggleButtonProps>().toHaveProperty("value");
    // @ts-expect-error not a ToggleButton prop
    <ToggleButton nonsense="x" value="a" />;
  });
});
