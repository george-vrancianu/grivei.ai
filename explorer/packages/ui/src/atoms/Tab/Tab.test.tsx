import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Tabs } from "../Tabs/index.ts";
import { Tab, type TabProps } from "./index.ts";

describe("Tab", () => {
  it("passes MUI props (label, disabled) and sx through", () => {
    renderInUi(
      <Tabs value="a">
        <Tab value="a" label="Contracte" sx={sxProbe} />
        <Tab value="b" label="Licitații" disabled />
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "Contracte" })).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("tab", { name: "Licitații" })).toBeDisabled();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TabProps>().toHaveProperty("label");
    expectTypeOf<TabProps>().toHaveProperty("sx");
    // @ts-expect-error not a Tab prop
    <Tab nonsense="x" />;
  });
});
