import { rgb } from "../../../testing/color.ts";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { SignalMark } from "./index.ts";

describe("SignalMark", () => {
  it("is a hollow amber ring, hidden from assistive technology, and never red", () => {
    const { container } = renderInUi(<SignalMark />);
    const mark = container.querySelector("[data-signal-mark]")!;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    const style = getComputedStyle(mark);
    expect(style.borderTopColor).toBe(rgb(color.accent));
    expect(style.backgroundColor).not.toBe(rgb(color.accent));
  });
});
