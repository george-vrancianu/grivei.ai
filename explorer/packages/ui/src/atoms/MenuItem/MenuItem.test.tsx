import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../testing/render.tsx";
import { sxProbe, sxProbeStyle } from "../../testing/sx.ts";
import { Menu } from "../Menu/index.ts";
import { MenuItem, type MenuItemProps } from "./index.ts";

describe("MenuItem", () => {
  it("passes role, aria-checked and sx through", () => {
    renderInUi(<Menu open anchorEl={document.body}><MenuItem role="menuitemradio" aria-checked sx={sxProbe}>Contract</MenuItem></Menu>);
    const item = screen.getByRole("menuitemradio", { name: "Contract", checked: true });
    expect(item).toHaveStyle(sxProbeStyle);
  });
  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    renderInUi(<Menu open anchorEl={document.body}><MenuItem onClick={onClick}>Contract</MenuItem></Menu>);
    await userEvent.click(screen.getByRole("menuitem", { name: "Contract" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("accepts MUI props at the type level", () => {
    expectTypeOf<MenuItemProps>().toHaveProperty("selected");
    expectTypeOf<MenuItemProps>().toHaveProperty("sx");
  });
});
