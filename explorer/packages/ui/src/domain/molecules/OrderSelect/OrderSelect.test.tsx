import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { OrderSelect } from "./index.ts";

const copy = { label: "Order", options: { VALUE_DESC: "value, high to low", DATE_DESC: "date, newest first", DATE_ASC: "date, oldest first" } } as const;

describe("OrderSelect", () => {
  it("is a named select showing the current order, with every order as an option", () => {
    renderInUi(<OrderSelect value="DATE_DESC" onChange={() => {}} copy={copy} />);
    const select = screen.getByRole("combobox", { name: "Order" });
    expect(select).toHaveValue("DATE_DESC");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["value, high to low", "date, newest first", "date, oldest first"]);
  });

  it("reports the chosen order", async () => {
    const onChange = vi.fn();
    renderInUi(<OrderSelect value="VALUE_DESC" onChange={onChange} copy={copy} />);
    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Order" }), "date, oldest first");
    expect(onChange).toHaveBeenCalledWith("DATE_ASC");
  });
});
