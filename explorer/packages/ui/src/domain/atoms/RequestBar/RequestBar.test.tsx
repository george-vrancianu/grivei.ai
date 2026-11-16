import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { RequestBar } from "./index.ts";

describe("RequestBar", () => {
  it("draws a decorative bar while busy", () => {
    const { container } = renderInUi(<RequestBar busy />);
    const bar = container.querySelector("[role='progressbar']");
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).not.toHaveAttribute("aria-label");
  });

  it("draws nothing when idle", () => {
    const { container } = renderInUi(<RequestBar busy={false} />);
    expect(container.querySelector("[role='progressbar']")).toBeNull();
  });
});
