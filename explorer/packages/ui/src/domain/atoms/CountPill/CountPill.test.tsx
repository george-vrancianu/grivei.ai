import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { CountPill } from "./index.ts";

describe("CountPill", () => {
  it("shows the number in a rounded pill with a hairline, in the muted colour", () => {
    renderInUi(<CountPill>1,817</CountPill>);
    const pill = screen.getByText("1,817");
    const style = getComputedStyle(pill);
    expect(style.borderTopWidth).toBe("1px");
    expect(style.borderRadius).toBe("10px");
    expect(pill).toHaveStyle({ color: color.muted });
  });
});
