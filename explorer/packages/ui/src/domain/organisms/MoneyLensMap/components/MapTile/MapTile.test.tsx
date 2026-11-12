import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapTile } from "./index.ts";

describe("MapTile", () => {
  it("is a toggle button named by its title and figures, unpressed by default", () => {
    render(<MapTile title="National">RON 1,000</MapTile>);
    expect(screen.getByRole("button", { name: "National RON 1,000", pressed: false })).toBeVisible();
  });

  it("shows when it is selected, and emits on click", async () => {
    const onSelect = vi.fn();
    render(<MapTile title="National" selected onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "National", pressed: true }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
