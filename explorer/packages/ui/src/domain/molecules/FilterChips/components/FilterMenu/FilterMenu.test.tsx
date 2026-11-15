import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { FilterMenu, MenuOption } from "./index.ts";

// While the menu is open the rest of the page is aria-hidden, the button included.
const button = () => screen.getByRole("button", { name: /Procedure/, hidden: true });

describe("FilterMenu", () => {
  it("shows the group name and the unset label, with the menu closed", () => {
    renderInUi(<FilterMenu label="Procedure" value={undefined} unsetLabel="Any">{null}</FilterMenu>);
    expect(button()).toHaveTextContent("Procedure Any");
    expect(button()).toHaveAttribute("aria-haspopup", "menu");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows the value when set", () => {
    renderInUi(<FilterMenu label="Procedure" value="Open tender" unsetLabel="Any">{null}</FilterMenu>);
    expect(button()).toHaveTextContent("Procedure Open tender");
  });

  it("outlines a set, closed button in the accent without the open fill, and keeps the raised shadow", () => {
    renderInUi(<><FilterMenu label="Procedure" value="Open tender" unsetLabel="Any">{null}</FilterMenu><FilterMenu label="Other" value={undefined} unsetLabel="Any">{null}</FilterMenu></>);
    const style = getComputedStyle(button());
    expect(style.boxShadow).toContain("rgb(242, 179, 61) 0px 0px 0px 1px inset");
    expect(style.boxShadow).toContain("rgba(0, 0, 0, 0.5) 0px 1px 2px");
    expect(style.backgroundColor).toBe(getComputedStyle(screen.getByRole("button", { name: /Other/ })).backgroundColor);
  });

  it("starts open on request, with aria-expanded true", () => {
    renderInUi(<FilterMenu label="Procedure" value={undefined} unsetLabel="Any" defaultOpen><MenuOption role="menuitemradio" checked={false} onChoose={() => {}}>Open</MenuOption></FilterMenu>);
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: /Procedure/ })).toBeVisible();
  });

  it("keeps a multi-select open on a pick, and a function child can close it", async () => {
    const onChoose = vi.fn();
    renderInUi(
      <FilterMenu label="Procedure" value={undefined} unsetLabel="Any">
        {({ close }) => [
          <MenuOption key="a" role="menuitemcheckbox" checked={false} onChoose={onChoose}>A</MenuOption>,
          <MenuOption key="b" role="menuitemcheckbox" checked onChoose={close}>B</MenuOption>,
        ]}
      </FilterMenu>,
    );
    await userEvent.click(button());
    expect(screen.getByRole("menuitemcheckbox", { name: "B", checked: true })).toBeVisible();
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "A" }));
    expect(onChoose).toHaveBeenCalledOnce();
    expect(screen.getByRole("menu")).toBeVisible();
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "B" }));
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});
