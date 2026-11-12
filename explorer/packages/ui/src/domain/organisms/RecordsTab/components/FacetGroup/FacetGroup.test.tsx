import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FacetGroup, type FacetOptionData } from "./index.ts";

const option = (id: string, label: string, extra: Partial<FacetOptionData> = {}): FacetOptionData => ({ id, label, pressed: false, onToggle: () => {}, ...extra });
const optionText = (label: string, count: string) => `${label} (${count})`;

describe("FacetGroup", () => {
  it("shows each value with its count, and ≈ when the count is an estimate", () => {
    render(
      <FacetGroup
        title="Channel"
        locale="en"
        optionText={optionText}
        options={[option("a", "Contract", { count: { records: 1234, estimated: false } }), option("b", "Direct purchase", { count: { records: 5000, estimated: true } })]}
      />,
    );
    const group = screen.getByRole("group", { name: "Channel" });
    expect(group).toBeVisible();
    expect(screen.getByRole("button", { name: "Contract (1,234)" })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Direct purchase \(≈\s5,000\)$/ })).toBeVisible();
  });
  it("marks the active values and shows one without a count by its label alone", async () => {
    const onToggle = vi.fn();
    render(<FacetGroup title="Channel" locale="en" optionText={optionText} options={[option("a", "Contract", { pressed: true, onToggle })]} />);
    const chip = screen.getByRole("button", { name: "Contract", pressed: true });
    await userEvent.setup().click(chip);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
