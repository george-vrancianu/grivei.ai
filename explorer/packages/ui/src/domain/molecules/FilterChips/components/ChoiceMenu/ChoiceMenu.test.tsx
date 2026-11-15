import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { ChoiceMenu } from "./index.ts";

const options = [{ value: "DIRECT_PURCHASE", label: "Direct purchase" }, { value: "CONTRACT", label: "Contract" }] as const;
const setup = (selected: "DIRECT_PURCHASE" | "CONTRACT" | undefined, onChoose = vi.fn()) => {
  renderInUi(<ChoiceMenu label="Channel" unsetLabel="Any" options={options} selected={selected} onChoose={onChoose} />);
  return onChoose;
};
// While the menu is open the rest of the page is aria-hidden, the button included.
const button = () => screen.getByRole("button", { name: /Channel/, hidden: true });

describe("ChoiceMenu", () => {
  it("shows the group name and Any when nothing is chosen", () => {
    setup(undefined);
    expect(button()).toHaveTextContent("ChannelAny");
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the chosen value on the button", () => {
    setup("CONTRACT");
    expect(button()).toHaveTextContent("ChannelContract");
  });

  it("opens a menu of radio items with the chosen one checked", async () => {
    setup("CONTRACT");
    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: /Channel/ })).toBeVisible();
    expect(screen.getByRole("menuitemradio", { name: "Contract", checked: true })).toBeVisible();
    expect(screen.getByRole("menuitemradio", { name: "Direct purchase", checked: false })).toBeVisible();
  });

  it("reports the item picked, selected or not, and closes", async () => {
    const onChoose = setup("CONTRACT");
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Direct purchase" }));
    expect(onChoose).toHaveBeenLastCalledWith("DIRECT_PURCHASE");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Contract" }));
    expect(onChoose).toHaveBeenLastCalledWith("CONTRACT");
  });

  it("moves with the arrows, closes on Escape and returns focus to the button", async () => {
    setup(undefined);
    await userEvent.click(button());
    expect(screen.getByRole("menuitemradio", { name: "Direct purchase" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "Contract" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(button()).toHaveFocus();
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens from the keyboard", async () => {
    setup(undefined);
    await userEvent.tab();
    expect(button()).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeVisible();
  });
});
