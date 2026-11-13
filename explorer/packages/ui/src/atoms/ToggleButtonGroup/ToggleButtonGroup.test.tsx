import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { ToggleButton } from "../ToggleButton/index.ts";
import { ToggleButtonGroup, type ToggleButtonGroupProps } from "./index.ts";

function Lens() {
  const [value, setValue] = useState("money");
  return (
    <ToggleButtonGroup exclusive aria-label="Lens" value={value} onChange={(_e, next: string | null) => next && setValue(next)} sx={sxProbe}>
      <ToggleButton value="money">Money</ToggleButton>
      <ToggleButton value="coverage">Coverage</ToggleButton>
    </ToggleButtonGroup>
  );
}

describe("ToggleButtonGroup", () => {
  it("is a named group whose chosen segment is pressed, and choosing another moves it", async () => {
    renderInUi(<Lens />);
    expect(screen.getByRole("group", { name: "Lens" })).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("button", { name: "Money" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Coverage" }));
    expect(screen.getByRole("button", { name: "Coverage" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Money" })).toHaveAttribute("aria-pressed", "false");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<ToggleButtonGroupProps>().toHaveProperty("exclusive");
    // @ts-expect-error not a ToggleButtonGroup prop
    <ToggleButtonGroup nonsense="x" />;
  });
});
