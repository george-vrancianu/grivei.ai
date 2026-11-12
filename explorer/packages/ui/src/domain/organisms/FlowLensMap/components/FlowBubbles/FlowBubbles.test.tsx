import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlowBubbles } from "./index.ts";

describe("FlowBubbles", () => {
  it("draws one circle per bubble at its position and radius, hidden from assistive tech", () => {
    const { container } = render(
      <svg><FlowBubbles bubbles={[{ code: "A", x: 10, y: 20, r: 5, awarded: "1" }, { code: "B", x: 30, y: 40, r: 9, awarded: "2" }]} /></svg>,
    );
    const circles = container.querySelectorAll("[data-bubble]");
    expect(circles).toHaveLength(2);
    expect(circles[1]).toHaveAttribute("cx", "30");
    expect(circles[1]).toHaveAttribute("r", "9");
    expect(container.querySelector("g")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws nothing for no bubbles", () => {
    const { container } = render(<svg><FlowBubbles bubbles={[]} /></svg>);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });
});
