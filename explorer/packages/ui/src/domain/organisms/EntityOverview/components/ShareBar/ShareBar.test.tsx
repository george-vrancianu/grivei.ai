import { renderInUi } from "../../../../../testing/render.tsx";
import { ShareBar } from "./index.ts";

describe("ShareBar", () => {
  it.each([
    [0.188, "18.8"],
    [1, "100"],
    [null, "0"],
  ] as const)("a share of %s fills %s%% of the track and is hidden from assistive technology", (share, percent) => {
    const { container } = renderInUi(<ShareBar share={share} />);
    const bar = container.querySelector("[role='progressbar']")!;
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveAttribute("aria-valuenow", percent);
  });
});
