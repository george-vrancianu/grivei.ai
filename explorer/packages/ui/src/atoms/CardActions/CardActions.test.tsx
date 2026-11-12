import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { CardActions, type CardActionsProps } from "./index.ts";

describe("CardActions", () => {
  it("passes MUI props (disableSpacing) and sx through", () => {
    renderInUi(<CardActions disableSpacing role="group" aria-label="Acțiuni" sx={sxProbe} />);
    const actions = screen.getByRole("group", { name: "Acțiuni" });
    expect(actions).not.toHaveClass("MuiCardActions-spacing");
    expect(actions).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<CardActionsProps>().toHaveProperty("disableSpacing");
    expectTypeOf<CardActionsProps>().toHaveProperty("sx");
    // @ts-expect-error not a CardActions prop
    <CardActions nonsense="x" />;
  });
});
