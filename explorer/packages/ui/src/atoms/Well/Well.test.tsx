import { rgb } from "../../testing/color.ts";
import { screen } from "@testing-library/react";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { color } from "../../theme/tokens.ts";
import { Well } from "./index.ts";


describe("Well", () => {
  it("is sunk into its panel: ground fill, a hairline and the inset shadow", () => {
    renderInUi(<Well role="group" aria-label="Harta">x</Well>);
    const well = screen.getByRole("group", { name: "Harta" });
    expect(getComputedStyle(well).backgroundColor).toBe(rgb(color.bg));
    expect(getComputedStyle(well).borderTopColor).toBe(rgb(color.line));
    expect(getComputedStyle(well).boxShadow).toMatch(/\binset\b/);
  });
  it("takes the stronger edge for an input", () => {
    renderInUi(<Well edge="lineStrong" role="group" aria-label="Căutare">x</Well>);
    expect(getComputedStyle(screen.getByRole("group", { name: "Căutare" })).borderTopColor).toBe(rgb(color.lineStrong));
  });
  it("passes MUI props and sx through", () => {
    renderInUi(<Well role="group" aria-label="Harta" sx={sxProbe}>x</Well>);
    expect(screen.getByRole("group", { name: "Harta" })).toHaveStyle(sxProbeStyle);
  });
});
