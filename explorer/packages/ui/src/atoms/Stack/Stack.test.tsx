import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Stack, type StackProps } from "./index.ts";

describe("Stack", () => {
  it("passes MUI props (direction, spacing) and sx through", () => {
    renderInUi(<Stack direction="row" spacing={2} role="group" aria-label="Filtre" sx={sxProbe}><span>a</span><span>b</span></Stack>);
    const stack = screen.getByRole("group", { name: "Filtre" });
    expect(stack).toHaveStyle({ flexDirection: "row", ...sxProbeStyle });
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<StackProps>().toHaveProperty("direction");
    expectTypeOf<StackProps>().toHaveProperty("sx");
    // @ts-expect-error not a Stack prop
    <Stack nonsense="x" />;
  });
});
