import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import type { ActiveChip } from "../../filterChips.utils.ts";
import { ActiveChips } from "./index.ts";

const { active } = sampleCopy.filterChips("en");
const chip = (id: string, label: string): ActiveChip => ({ id, label, remove: (f) => f });

describe("ActiveChips", () => {
  it("says so when no chip is on, with no clear action", () => {
    render(<ActiveChips chips={[]} onRemove={() => {}} onClearAll={() => {}} copy={active} />);
    expect(screen.getByRole("group", { name: "Active filters" })).toBeVisible();
    expect(screen.getByText("No filters on.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("gives every chip a remove action named after it and reports the chip", async () => {
    const onRemove = vi.fn();
    const chips = [chip("a", "Contract"), chip("b", "Licitație deschisă")];
    render(<ActiveChips chips={chips} onRemove={onRemove} onClearAll={() => {}} copy={active} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Licitație deschisă" }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(chips[1]);
  });

  it("removes from the keyboard", async () => {
    const onRemove = vi.fn();
    render(<ActiveChips chips={[chip("a", "Contract")]} onRemove={onRemove} onClearAll={() => {}} copy={active} />);
    screen.getByRole("button", { name: "Remove Contract" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("offers Clear all", async () => {
    const onClearAll = vi.fn();
    render(<ActiveChips chips={[chip("a", "Contract")]} onRemove={() => {}} onClearAll={onClearAll} copy={active} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });
});
