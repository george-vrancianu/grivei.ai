import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import type { ResultTab } from "../ResultTabs/index.ts";
import { FullResultsSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("FullResultsSkeleton (%s)", (locale) => {
  const copy = sampleCopy.fullResults(locale);
  const setup = (tab: ResultTab) => renderInUi(<FullResultsSkeleton tab={tab} copy={{ heading: copy.heading[tab], head: copy.entityRow.head }} status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real kind as the panel's heading, with a hidden block for the count", () => {
    setup("suppliers");
    const panel = within(screen.getByRole("region", { name: copy.heading.suppliers }));
    expect(panel.getByRole("heading", { level: 2, name: copy.heading.suppliers })).toBeVisible();
    expect(panel.getByRole("heading").querySelector(".MuiSkeleton-root")).toHaveAttribute("aria-hidden", "true");
  });

  it("says it is loading once, in the header strip, and hides every block", () => {
    const { container } = setup("suppliers");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    for (const block of container.querySelectorAll(".MuiSkeleton-root")) expect(block.closest("[aria-hidden=true]") ?? block.closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByRole("list", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("holds the column head on Suppliers and Authorities, and not on Records", () => {
    const { unmount } = setup("suppliers");
    expect(screen.getByText(copy.entityRow.head.supplier)).toBeInTheDocument();
    unmount();
    const authorities = setup("authorities");
    expect(screen.getByText(copy.entityRow.head.authority)).toBeInTheDocument();
    authorities.unmount();
    setup("records");
    expect(screen.queryByText(copy.entityRow.head.signals)).toBeNull();
  });
});
