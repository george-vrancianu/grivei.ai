import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { RecordSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("RecordSkeleton (%s)", (locale) => {
  const { value, parties, heading } = sampleCopy.recordDetail(locale);
  const setup = () => renderInUi(<RecordSkeleton copy={{ value, winners: parties.winners, facts: heading.panel }} status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real panel titles and figure labels", () => {
    setup();
    for (const name of [value.heading, parties.winners, heading.panel]) expect(screen.getByRole("region", { name })).toBeVisible();
    const panel = within(screen.getByRole("region", { name: value.heading }));
    expect(panel.getByText(value.published)).toBeVisible();
    expect(panel.getByText(value.counted)).toBeVisible();
  });

  it("says it is loading once, in the value panel's header strip, and hides every block", () => {
    const { container } = setup();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: value.heading })).getByRole("status")).toHaveTextContent("Loading");
    const blocks = container.querySelectorAll(".MuiSkeleton-root");
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) expect(block.closest("[aria-hidden=true]")).not.toBeNull();
  });
});
