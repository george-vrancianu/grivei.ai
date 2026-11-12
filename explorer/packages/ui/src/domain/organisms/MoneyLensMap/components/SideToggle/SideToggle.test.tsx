import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { SideToggle } from "./index.ts";

const { side: copy } = sampleCopy.moneyLensMap("en");

describe("SideToggle", () => {
  it("shows the current side as pressed inside a named group", () => {
    render(<SideToggle side="SUPPLIER" onSideChange={() => {}} copy={copy} />);
    const group = screen.getByRole("group", { name: "Show counties by" });
    expect(group).toBeVisible();
    expect(screen.getByRole("button", { name: "Suppliers", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Authorities", pressed: false })).toBeVisible();
  });

  it("emits the other side when it is clicked", async () => {
    const onSideChange = vi.fn();
    render(<SideToggle side="AUTHORITY" onSideChange={onSideChange} copy={copy} />);
    await userEvent.click(screen.getByRole("button", { name: "Suppliers" }));
    expect(onSideChange).toHaveBeenCalledExactlyOnceWith("SUPPLIER");
  });
});
