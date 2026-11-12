import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceChips } from "./index.ts";

const options = [{ value: "DIRECT_PURCHASE", label: "Direct purchase" }, { value: "CONTRACT", label: "Contract" }] as const;

describe("ChoiceChips", () => {
  it("shows the selected option as pressed in a named group", () => {
    render(<ChoiceChips label="Channel" options={options} selected="CONTRACT" onChoose={() => {}} />);
    const group = screen.getByRole("group", { name: "Channel" });
    expect(group).toBeVisible();
    expect(screen.getByRole("button", { name: "Contract", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Direct purchase", pressed: false })).toBeVisible();
  });

  it("reports the option clicked, selected or not", async () => {
    const onChoose = vi.fn();
    render(<ChoiceChips label="Channel" options={options} selected="CONTRACT" onChoose={onChoose} />);
    await userEvent.click(screen.getByRole("button", { name: "Direct purchase" }));
    await userEvent.click(screen.getByRole("button", { name: "Contract" }));
    expect(onChoose.mock.calls).toEqual([["DIRECT_PURCHASE"], ["CONTRACT"]]);
  });
});
