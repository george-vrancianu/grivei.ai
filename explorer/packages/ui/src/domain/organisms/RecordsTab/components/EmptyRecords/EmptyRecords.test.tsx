import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { EmptyRecords } from "./index.ts";

const copy = sampleCopy.recordsTab("en").empty;

describe("EmptyRecords", () => {
  it("says nothing matches and offers to clear the facets that are on", async () => {
    const onClear = vi.fn();
    render(<EmptyRecords copy={copy} onClear={onClear} />);
    expect(screen.getByText("No Records match these filters.")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
  it("offers no button when no facet is on", () => {
    render(<EmptyRecords copy={copy} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
