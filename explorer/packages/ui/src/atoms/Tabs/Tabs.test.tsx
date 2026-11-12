import { screen } from "@testing-library/react";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Tab } from "../Tab/index.ts";
import { Tabs, type TabsProps } from "./index.ts";

describe("Tabs", () => {
  it("passes MUI props (value, aria-label) and sx through", () => {
    renderInUi(
      <Tabs value="b" aria-label="Rezultate" sx={sxProbe}>
        <Tab value="a" label="Contracte" />
        <Tab value="b" label="Licitații" />
      </Tabs>,
    );
    const tablist = screen.getByRole("tablist", { name: "Rezultate" });
    expect(tablist.closest(".MuiTabs-root")).toHaveStyle(sxProbeStyle);
    expect(screen.getByRole("tab", { name: "Licitații" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Contracte" })).toHaveAttribute("aria-selected", "false");
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<TabsProps>().toHaveProperty("value");
    expectTypeOf<TabsProps>().toHaveProperty("sx");
    // @ts-expect-error not a Tabs prop
    <Tabs nonsense="x" />;
  });
});
