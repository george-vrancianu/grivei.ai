import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { RowSkeletonList } from "./index.ts";
import { ROW_COUNT, rowOpacity } from "../../utils/resultsSkeleton.ts";

describe("RowSkeletonList", () => {
  it("is eight rows of blocks, all hidden from assistive technology", () => {
    const { container } = renderInUi(<RowSkeletonList />);
    const list = container.querySelector("ul");
    expect(list).toHaveAttribute("aria-hidden", "true");
    expect(list?.children).toHaveLength(ROW_COUNT);
    expect(ROW_COUNT).toBe(8);
  });

  it("fades down the list", () => {
    expect([0, 1, 7].map(rowOpacity)).toEqual([1, 0.91, 0.37]);
  });
});
