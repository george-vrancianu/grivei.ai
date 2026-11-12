import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { CardContent, type CardContentProps } from "./index.ts";

describe("CardContent", () => {
  it("passes MUI props and sx through", () => {
    renderInUi(<CardContent role="region" aria-label="Detalii" sx={sxProbe}>Text lung</CardContent>);
    expect(screen.getByRole("region", { name: "Detalii" })).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<CardContentProps>().toHaveProperty("sx");
    // @ts-expect-error not a CardContent prop
    <CardContent nonsense="x" />;
  });
});
