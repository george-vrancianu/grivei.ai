import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Chip, type ChipProps } from "./index.ts";

describe("Chip", () => {
  it("passes MUI props (label, onDelete, color) and sx through", () => {
    renderInUi(<Chip label="Contract" color="primary" onDelete={() => {}} sx={sxProbe} />);
    const chip = screen.getByText("Contract").closest(".MuiChip-root");
    expect(chip).toHaveClass("MuiChip-colorPrimary");
    expect(chip).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<ChipProps>().toHaveProperty("label");
    expectTypeOf<ChipProps>().toHaveProperty("sx");
    // @ts-expect-error not a Chip prop
    <Chip nonsense="x" />;
  });
});
