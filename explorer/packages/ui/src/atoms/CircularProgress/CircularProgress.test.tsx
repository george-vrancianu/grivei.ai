import { screen } from "@testing-library/react";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { CircularProgress } from "./index.ts";

describe("CircularProgress", () => {
  it("passes MUI props (size, aria-label) and sx through", () => {
    renderInUi(<CircularProgress aria-label="Se încarcă" size={16} sx={sxProbe} />);
    const bar = screen.getByRole("progressbar", { name: "Se încarcă" });
    expect(bar).toHaveStyle(sxProbeStyle);
    expect(bar).toHaveStyle({ width: "16px" });
  });
});
