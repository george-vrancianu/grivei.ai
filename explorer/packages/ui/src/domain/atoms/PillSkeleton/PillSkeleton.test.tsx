import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { PillSkeleton } from "./index.ts";

describe("PillSkeleton", () => {
  it("is a block hidden from assistive technology", () => {
    const { container } = renderInUi(<PillSkeleton />);
    const block = container.querySelector(".MuiSkeleton-root");
    expect(block).toHaveAttribute("aria-hidden", "true");
  });
});
