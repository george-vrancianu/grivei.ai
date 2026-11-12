import { screen } from "@testing-library/react";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { LinearProgress } from "./index.ts";

describe("LinearProgress", () => {
  it("passes MUI props (value, aria-label) and sx through", () => {
    renderInUi(<LinearProgress variant="determinate" value={40} aria-label="Pondere" sx={sxProbe} />);
    const bar = screen.getByRole("progressbar", { name: "Pondere" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveStyle(sxProbeStyle);
  });
});
