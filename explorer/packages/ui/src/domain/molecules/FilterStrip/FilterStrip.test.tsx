import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { FilterStrip } from "./index.ts";

describe("FilterStrip", () => {
  it("pads its content so it does not sit against the panel edge", () => {
    renderInUi(
      <FilterStrip>
        <span>chips</span>
      </FilterStrip>,
    );
    const strip = screen.getByText("chips").parentElement as HTMLElement;
    const style = getComputedStyle(strip);
    expect(style.paddingLeft).toBe("20px");
    expect(style.paddingRight).toBe("20px");
    expect(style.paddingBottom).toBe("12px");
  });
});
