import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OnrcFilter } from "@grivei/contract";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcFilterChips } from "./index.ts";

function setup(filter: OnrcFilter = {}, locale: "en" | "ro" = "en") {
  const onChange = vi.fn();
  renderInUi(<OnrcFilterChips filter={filter} onChange={onChange} locale={locale} copy={sampleOnrcCopy.filterChips(locale)} />, locale);
  return onChange;
}

describe("OnrcFilterChips", () => {
  it("toggles a status code on and off, several at a time", async () => {
    const onChange = setup({ status: [1048] });
    expect(screen.getByRole("button", { name: "In operation", pressed: true })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Insolvency", pressed: false }));
    expect(onChange).toHaveBeenLastCalledWith({ status: [1048, 1107] });
    await userEvent.click(screen.getByRole("button", { name: "In operation", pressed: true }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("offers SEAP counterparties only, or not in SEAP; false is a value of its own", async () => {
    const onChange = setup({ seapCounterparty: false });
    expect(screen.getByRole("button", { name: "Not in SEAP", pressed: true })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "SEAP counterparties only", pressed: false }));
    expect(onChange).toHaveBeenLastCalledWith({ seapCounterparty: true });
    await userEvent.click(screen.getByRole("button", { name: "Not in SEAP", pressed: true }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("sends a CAEN code or prefix of digits when the field is left, drops it when emptied and ignores text that is not digits", async () => {
    const onChange = setup({ caen: "42" });
    const field = screen.getByRole("textbox", { name: "CAEN code or prefix" });
    expect(field).toHaveValue("42");
    await userEvent.clear(field);
    await userEvent.type(field, "4211");
    fireEvent.blur(field);
    expect(onChange).toHaveBeenLastCalledWith({ caen: "4211" });
    await userEvent.clear(field);
    await userEvent.type(field, "abc");
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.clear(field);
    fireEvent.blur(field);
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("sets and clears the registration-date range", () => {
    const onChange = setup({ registeredFrom: "2020-01-01" });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2020-12-31" } });
    expect(onChange).toHaveBeenLastCalledWith({ registeredFrom: "2020-01-01", registeredTo: "2020-12-31" });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("lists every active chip, each removable, and clears them all; the query is not a chip", async () => {
    const onChange = setup({ q: "alfa", status: [1048, 2110], caen: "42", county: "RO-CJ", registeredFrom: "2020-01-01", seapCounterparty: true });
    const group = within(screen.getByRole("group", { name: "Active filters" }));
    expect(group.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Remove In operation", "Remove Status 2110", "Remove CAEN 42", "Remove County RO-CJ", "Remove Registered from 1 January 2020", "Remove SEAP counterparties only", "Clear all",
    ]);
    await userEvent.click(group.getByRole("button", { name: "Remove County RO-CJ" }));
    expect(onChange).toHaveBeenLastCalledWith({ q: "alfa", status: [1048, 2110], caen: "42", registeredFrom: "2020-01-01", seapCounterparty: true });
    await userEvent.click(group.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenLastCalledWith({ q: "alfa" });
  });

  it("names the Unplaced tile's chip, offers a status that came in through the URL, and reads in Romanian", () => {
    setup({ county: "UNPLACED", status: [2110] }, "ro");
    expect(screen.getByRole("button", { name: "Elimină Fără județ" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Starea 2110", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Radiată", pressed: false })).toBeVisible();
  });
});
