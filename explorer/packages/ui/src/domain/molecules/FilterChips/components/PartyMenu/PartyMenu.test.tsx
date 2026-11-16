import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { PartyMenu } from "./index.ts";

const sample = sampleCopy.filterChips("en");
const parties = ["PARTIDUL SOCIAL DEMOCRAT", "ALIANȚA USR PLUS"];
const setup = (selected: string | undefined, onChoose = vi.fn(), list = parties) => {
  renderInUi(<PartyMenu parties={list} selected={selected} onChoose={onChoose} copy={sample.party} unsetLabel={sample.menuAny} />);
  return onChoose;
};
const button = () => screen.getByRole("button", { name: /Party/, hidden: true });

describe("PartyMenu", () => {
  it("shows Any with none chosen, and the list's name once chosen", () => {
    setup(undefined);
    expect(button()).toHaveTextContent("Party Any");
  });

  it("shows the chosen list", () => {
    setup("ALIANȚA USR PLUS");
    expect(button()).toHaveTextContent("Party ALIANȚA USR PLUS");
  });

  it("offers the lists as registered, one choice at a time", async () => {
    setup("ALIANȚA USR PLUS");
    await userEvent.click(button());
    expect(screen.getAllByRole("menuitemradio").map((o) => o.textContent)).toEqual(parties);
    expect(screen.getByRole("menuitemradio", { name: "ALIANȚA USR PLUS", checked: true })).toBeVisible();
  });

  it("reports the list picked, and undefined when the chosen one is clicked again", async () => {
    const onChoose = setup("ALIANȚA USR PLUS");
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemradio", { name: "PARTIDUL SOCIAL DEMOCRAT" }));
    expect(onChoose).toHaveBeenLastCalledWith("PARTIDUL SOCIAL DEMOCRAT");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemradio", { name: "ALIANȚA USR PLUS" }));
    expect(onChoose).toHaveBeenLastCalledWith(undefined);
  });

  it("keeps a list the filter holds among the choices even when it was not offered", async () => {
    setup("PARTIDUL UNIC");
    await userEvent.click(button());
    expect(screen.getByRole("menuitemradio", { name: "PARTIDUL UNIC", checked: true })).toBeVisible();
  });
});
