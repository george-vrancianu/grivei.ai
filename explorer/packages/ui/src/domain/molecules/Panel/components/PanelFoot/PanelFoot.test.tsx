import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { STRIP_FILL } from "../../../../../theme/stripFill.ts";
import { PanelFoot } from "./index.ts";

describe("PanelFoot", () => {
  it("is a strip with the strip fill and a hairline on its top edge", () => {
    renderInUi(<PanelFoot>caveat</PanelFoot>);
    const foot = screen.getByText("caveat");
    expect(foot).toHaveStyle({ backgroundColor: STRIP_FILL });
    expect(getComputedStyle(foot).borderTopWidth).toBe("1px");
  });
});
