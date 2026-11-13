import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { SignalMark } from "./index.ts";

describe("SignalMark", () => {
  it("is a hollow amber ring, hidden from assistive technology, and never red", () => {
    const { container } = renderInUi(<SignalMark />);
    const mark = container.querySelector("[data-signal-mark]")!;
    expect(mark).toHaveAttribute("aria-hidden", "true");
    const style = getComputedStyle(mark);
    expect(style.borderTopColor).toBe(hexToRgb(color.accent));
    expect(style.backgroundColor).not.toBe(hexToRgb(color.accent));
  });
});

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
}
