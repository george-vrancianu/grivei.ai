import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToggleChip } from "./index.ts";

describe("ToggleChip", () => {
  it("is a button that shows whether it is on", () => {
    const { rerender } = render(<ToggleChip label="Contract" pressed={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Contract", pressed: false })).toBeVisible();
    rerender(<ToggleChip label="Contract" pressed onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Contract", pressed: true })).toBeVisible();
  });

  it("calls onToggle on click and on the keyboard", async () => {
    const onToggle = vi.fn();
    render(<ToggleChip label="Contract" pressed={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: "Contract" }));
    screen.getByRole("button", { name: "Contract" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("describes itself with its explanation", () => {
    render(<ToggleChip label="No value" description="SEAP publishes no value." pressed={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "No value" })).toHaveAccessibleDescription("SEAP publishes no value.");
  });
});
