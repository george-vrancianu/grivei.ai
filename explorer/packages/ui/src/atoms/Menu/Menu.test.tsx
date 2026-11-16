import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../testing/render.tsx";
import { MenuItem } from "../MenuItem/index.ts";
import { Menu, type MenuProps } from "./index.ts";
import { expectTypeOf } from "vitest";

describe("Menu", () => {
  it("renders its items in a portalled menu while open, and nothing while closed", () => {
    const { rerender } = renderInUi(<Menu open anchorEl={document.body} aria-label="Canal"><MenuItem>Contract</MenuItem></Menu>);
    expect(screen.getByRole("menu")).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Contract" })).toBeVisible();
    rerender(<Menu open={false} anchorEl={document.body}><MenuItem>Contract</MenuItem></Menu>);
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    renderInUi(<Menu open anchorEl={document.body} onClose={onClose}><MenuItem>Contract</MenuItem></Menu>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<MenuProps>().toHaveProperty("anchorEl");
    expectTypeOf<MenuProps>().toHaveProperty("sx");
  });
});
