import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { CardHeader, type CardHeaderProps } from "./index.ts";

describe("CardHeader", () => {
  it("passes MUI props (title, subheader) and sx through", () => {
    renderInUi(<CardHeader title="Municipiul București" subheader="Autoritate" sx={sxProbe} data-testid="h" />);
    expect(screen.getByText("Municipiul București")).toBeVisible();
    expect(screen.getByText("Autoritate")).toBeVisible();
    expect(screen.getByTestId("h")).toHaveStyle(sxProbeStyle);
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<CardHeaderProps>().toHaveProperty("title");
    expectTypeOf<CardHeaderProps>().toHaveProperty("sx");
  });
});
