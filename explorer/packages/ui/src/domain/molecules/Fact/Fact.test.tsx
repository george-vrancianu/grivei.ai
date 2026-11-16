import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { Fact } from "./index.ts";

describe("Fact", () => {
  it("shows the caption in muted mono over the value", () => {
    renderInUi(<Fact label="CUI">51000005</Fact>);
    const label = screen.getByText("CUI");
    const value = screen.getByText("51000005");
    expect(label).toHaveStyle({ color: color.muted });
    expect(getComputedStyle(label).fontSize).toBe("12px");
    expect(getComputedStyle(value).fontSize).toBe("14px");
    expect(label.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
