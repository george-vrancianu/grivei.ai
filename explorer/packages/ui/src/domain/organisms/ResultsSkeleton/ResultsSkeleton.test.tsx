import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { ResultsSkeleton, type ResultsSkeletonProps } from "./index.ts";
import { ROW_COUNT, rowOpacity } from "./resultsSkeleton.utils.ts";

describe.each(["en", "ro"] as const)("ResultsSkeleton (%s)", (locale) => {
  const { label, tabs } = sampleCopy.resultTabs(locale);
  const setup = (props: Pick<ResultsSkeletonProps, "onTabChange"> = {}) =>
    renderInUi(<ResultsSkeleton copy={{ label, tabs }} status={<LoadingStatus label="Loading" />} {...props} />, locale);

  it("keeps the real tab names, with a hidden block in place of each count", () => {
    setup();
    const list = screen.getByRole("tablist", { name: label });
    for (const name of Object.values(tabs)) expect(within(list).getByRole("tab", { name: new RegExp(name) })).toBeInTheDocument();
    expect(list.querySelectorAll(".MuiSkeleton-root")).toHaveLength(3);
  });

  it("selects Suppliers by default, and reports a tab change", async () => {
    const onTabChange = vi.fn();
    setup({ onTabChange });
    expect(screen.getByRole("tab", { name: new RegExp(tabs.suppliers) })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: new RegExp(tabs.records) }));
    expect(onTabChange).toHaveBeenCalledWith("records");
  });

  it("draws eight hidden rows, fading down the list, and keeps the status line", () => {
    setup();
    const rows = screen.getByRole("list", { hidden: true });
    expect(rows).toHaveAttribute("aria-hidden", "true");
    expect(rows.children).toHaveLength(ROW_COUNT);
    expect(ROW_COUNT).toBe(8);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});

it("fades 9 points per row", () => {
  expect([0, 1, 7].map(rowOpacity)).toEqual([1, 0.91, 0.37]);
});
