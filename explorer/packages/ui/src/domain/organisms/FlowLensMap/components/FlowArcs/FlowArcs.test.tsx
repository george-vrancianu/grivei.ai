import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { arcShape } from "../../flowLensMap.utils.ts";
import { FlowArcs } from "./index.ts";

describe("FlowArcs", () => {
  it("draws a curve and an arrowhead per arc, carrying its direction and width", () => {
    const arc = { code: "A", from: "A", to: "HOME", awarded: "5", width: 4, ...arcShape([0, 0], [100, 0], 5, 5, 4)! };
    const { container } = render(<svg><FlowArcs arcs={[arc]} /></svg>);
    const group = container.querySelector("[data-arc]")!;
    expect(group).toHaveAttribute("data-from", "A");
    expect(group).toHaveAttribute("data-to", "HOME");
    expect(group.querySelector("path")).toHaveAttribute("stroke-width", "4");
    expect(group.querySelector("path")).toHaveAttribute("d", arc.d);
    expect(group.querySelector("[data-arrowhead]")).toHaveAttribute("points", arc.head);
    expect(container.querySelector("g")).toHaveAttribute("aria-hidden", "true");
  });
});
