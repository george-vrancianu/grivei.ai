import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { PartyChips } from "./index.ts";

const copy = sampleCopy.filterChips("en").party;
const parties = ["PARTIDUL SOCIAL DEMOCRAT", "ALIANȚA USR PLUS"];

describe("PartyChips", () => {
  it("offers the lists as registered, after an 'Any' choice, with none chosen", () => {
    render(<PartyChips parties={parties} selected={undefined} onChoose={() => {}} copy={copy} />);
    expect(screen.getByRole("group", { name: "Party" })).toBeVisible();
    const select = screen.getByRole("combobox", { name: "List as registered" });
    expect(select).toHaveValue("");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Any party", ...parties]);
  });

  it("reports the list picked, and undefined when 'Any' is picked again", async () => {
    const onChoose = vi.fn();
    render(<PartyChips parties={parties} selected="ALIANȚA USR PLUS" onChoose={onChoose} copy={copy} />);
    const select = screen.getByRole("combobox", { name: "List as registered" });
    expect(select).toHaveValue("ALIANȚA USR PLUS");
    await userEvent.selectOptions(select, "PARTIDUL SOCIAL DEMOCRAT");
    expect(onChoose).toHaveBeenLastCalledWith("PARTIDUL SOCIAL DEMOCRAT");
    await userEvent.selectOptions(select, "Any party");
    expect(onChoose).toHaveBeenLastCalledWith(undefined);
  });

  it("keeps a list the filter holds among the choices even when it was not offered", () => {
    render(<PartyChips parties={parties} selected="PARTIDUL UNIC" onChoose={() => {}} copy={copy} />);
    expect(screen.getByRole("combobox", { name: "List as registered" })).toHaveValue("PARTIDUL UNIC");
  });
});
