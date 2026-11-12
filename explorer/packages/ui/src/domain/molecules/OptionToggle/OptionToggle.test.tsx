import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OptionToggle } from "./index.ts";

const options = ["a", "b", "c"] as const;
const labels = { a: "Alpha", b: "Beta", c: "Gamma" };

describe("OptionToggle", () => {
  it("shows the value as pressed inside a named group", () => {
    render(<OptionToggle options={options} value="b" onChange={() => {}} labels={labels} label="Letters" />);
    expect(screen.getByRole("group", { name: "Letters" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Beta", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Alpha", pressed: false })).toBeVisible();
    expect(screen.getByRole("button", { name: "Gamma", pressed: false })).toBeVisible();
  });

  it("emits the clicked option", async () => {
    const onChange = vi.fn();
    render(<OptionToggle options={options} value="a" onChange={onChange} labels={labels} label="Letters" />);
    await userEvent.click(screen.getByRole("button", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("c");
  });
});
