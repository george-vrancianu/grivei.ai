import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { LensToggle } from "./index.ts";

const { lens: copy } = sampleCopy.mainScreenLayout("en");

describe("LensToggle", () => {
  it("shows the current lens as pressed inside a named group", () => {
    render(<LensToggle lens="coverage" onLensChange={() => {}} copy={copy} />);
    expect(screen.getByRole("group", { name: "Map lens" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Coverage", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Money", pressed: false })).toBeVisible();
  });

  it("emits the clicked lens", async () => {
    const onLensChange = vi.fn();
    render(<LensToggle lens="money" onLensChange={onLensChange} copy={copy} />);
    await userEvent.click(screen.getByRole("button", { name: "Coverage" }));
    expect(onLensChange).toHaveBeenCalledExactlyOnceWith("coverage");
  });
});
