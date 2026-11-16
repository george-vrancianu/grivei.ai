import { screen } from "@testing-library/react";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { color } from "../../theme/tokens.ts";
import { Skeleton } from "./index.ts";

describe("Skeleton", () => {
  it("passes MUI props (size, aria-hidden) and sx through", () => {
    renderInUi(<Skeleton data-testid="sk" aria-hidden="true" width={72} height={22} sx={sxProbe} />);
    const block = screen.getByTestId("sk");
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveStyle({ width: "72px", height: "22px", ...sxProbeStyle });
  });

  it("fills with the raised token, and shimmers (wave) by default", () => {
    renderInUi(<Skeleton data-testid="sk" />);
    const block = screen.getByTestId("sk");
    expect(block).toHaveStyle({ backgroundColor: color.raised });
    expect(block.className).toContain("MuiSkeleton-wave");
  });
});
