import { rgb } from "../../../testing/color.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
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

  it("does not emit when the chosen option is clicked again", async () => {
    const onChange = vi.fn();
    render(<OptionToggle options={options} value="a" onChange={onChange} labels={labels} label="Letters" />);
    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sits on the well track, with the buttons directly inside the named group", () => {
    renderInUi(<OptionToggle options={options} value="b" onChange={() => {}} labels={labels} label="Letters" />);
    const group = screen.getByRole("group", { name: "Letters" });
    expect(getComputedStyle(group.parentElement!).borderTopColor).toBe(rgb(color.lineStrong));
    expect(getComputedStyle(group.parentElement!).boxShadow).toMatch(/\binset\b/);
    for (const name of ["Alpha", "Beta", "Gamma"]) expect(screen.getByRole("button", { name }).parentElement).toBe(group);
  });

  it("moves focus along the segments with the arrow keys and chooses with Enter", async () => {
    const onChange = vi.fn();
    render(<OptionToggle options={options} value="a" onChange={onChange} labels={labels} label="Letters" />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Beta" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("b");
  });
});
