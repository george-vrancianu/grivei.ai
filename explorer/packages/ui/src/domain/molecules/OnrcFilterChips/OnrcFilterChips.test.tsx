import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const menuButton = (group: string) => screen.getByRole("button", { name: new RegExp(`^${group}`) });
const ticked = () => screen.getAllByRole("menuitemcheckbox").map((item) => `${item.textContent}${item.getAttribute("aria-checked") === "true" ? " ✓" : ""}`);

describe("OnrcFilterChips", () => {
  it("keeps its menus and fields off the panel edge: they sit in a padded strip", () => {
    setup();
    let node: HTMLElement | null = menuButton("Status");
    let padded = false;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (style.paddingLeft === "20px" && style.paddingRight === "20px" && style.paddingBottom === "12px") padded = true;
      node = node.parentElement;
    }
    expect(padded).toBe(true);
  });

  it("puts the SEAP menu, a divider, the status menu, the CAEN field and the date menu on one row, in that order", () => {
    setup();
    const row = within(screen.getByTestId("filter-bar-row"));
    const inOrder = [
      row.getByRole("button", { name: "In SEAP Any" }),
      row.getByTestId("filter-bar-divider"),
      row.getByRole("button", { name: "Status Any" }),
      row.getByRole("textbox", { name: "CAEN" }),
      row.getByRole("button", { name: "Registered Any" }),
    ];
    for (let i = 1; i < inOrder.length; i++) expect(inOrder[i - 1]!.compareDocumentPosition(inOrder[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no status ticked by default (Any), and one pick filters by it", async () => {
    const onChange = setup({});
    expect(menuButton("Status")).toHaveTextContent("Status Any");
    await userEvent.click(menuButton("Status"));
    expect(ticked()).toEqual(["In operation", "Insolvency", "Struck off", "Temporarily suspended"]);
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Insolvency" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: [1107] });
  });

  it("names the one status ticked, and a second pick adds to it", async () => {
    const onChange = setup({ status: [1107] });
    expect(menuButton("Status")).toHaveTextContent("Status Insolvency");
    await userEvent.click(menuButton("Status"));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Struck off" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: [1107, 1084] });
  });

  it("counts several ticked statuses, and unticking the last one drops the filter", async () => {
    const onChange = setup({ status: [1048, 1107] });
    expect(menuButton("Status")).toHaveTextContent("Status 2 picked");
    await userEvent.click(menuButton("Status"));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "In operation" }));
    expect(onChange).toHaveBeenLastCalledWith({ status: [1107] });
  });

  it("unticks the only status to get back to Any", async () => {
    const onChange = setup({ status: [1048] });
    await userEvent.click(menuButton("Status"));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "In operation" }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("offers SEAP counterparties only, or not in SEAP; false is a value of its own, and a second pick unsets it", async () => {
    const onChange = setup({ seapCounterparty: false });
    expect(menuButton("In SEAP")).toHaveTextContent("In SEAP Not in SEAP");
    await userEvent.click(menuButton("In SEAP"));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "SEAP counterparties only" }));
    expect(onChange).toHaveBeenLastCalledWith({ seapCounterparty: true });
    await userEvent.click(menuButton("In SEAP"));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Not in SEAP" }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("shows the CAEN hint as the placeholder; sends a code or prefix of digits when the field is left, drops it when emptied and ignores text that is not digits", async () => {
    const onChange = setup({ caen: "42" });
    const field = screen.getByRole("textbox", { name: "CAEN" });
    expect(field).toHaveAttribute("placeholder", "4211 or 42");
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

  it("sets and clears the registration-date range in the date menu, and the button shows the range", async () => {
    const onChange = setup({ registeredFrom: "2020-01-01" });
    expect(menuButton("Registered")).toHaveTextContent("Registered 1 Jan 2020 –");
    await userEvent.click(menuButton("Registered"));
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2020-12-31" } });
    expect(onChange).toHaveBeenLastCalledWith({ registeredFrom: "2020-01-01", registeredTo: "2020-12-31" });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("marks the CAEN field invalid while its text is not digits, and does not report an unchanged empty field", async () => {
    const onChange = setup({});
    const field = screen.getByRole("textbox", { name: "CAEN" });
    await userEvent.type(field, "ab");
    expect(field).toHaveAttribute("aria-invalid", "true");
    await userEvent.clear(field);
    expect(field).toHaveAttribute("aria-invalid", "false");
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the date menu on Escape from a date field and returns focus to its button", async () => {
    setup({});
    await userEvent.click(menuButton("Registered"));
    const from = screen.getByLabelText("From");
    from.focus();
    expect(from).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(menuButton("Registered")).toHaveFocus();
  });

  it("lists every active chip in a strip of its own, each removable, and clears them all; the query is not a chip", async () => {
    const onChange = setup({ q: "alfa", status: [1048, 2110], caen: "42", county: "RO-CJ", registeredFrom: "2020-01-01", seapCounterparty: true });
    const group = within(screen.getByRole("group", { name: "Active filters" }));
    expect(group.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Remove In operation", "Remove Status 2110", "Remove CAEN 42", "Remove County: RO-CJ", "Remove Registered from 1 January 2020", "Remove SEAP counterparties only", "Clear all",
    ]);
    await userEvent.click(group.getByRole("button", { name: "Remove County: RO-CJ" }));
    expect(onChange).toHaveBeenLastCalledWith({ q: "alfa", status: [1048, 2110], caen: "42", registeredFrom: "2020-01-01", seapCounterparty: true });
    await userEvent.click(group.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenLastCalledWith({ q: "alfa" });
  });

  it("has no active strip when nothing is set", () => {
    setup({ q: "alfa" });
    expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
  });

  it("names the Unplaced tile's chip, offers a status that came in through the URL, and reads in Romanian", async () => {
    setup({ county: "UNPLACED", status: [2110] }, "ro");
    expect(screen.getByRole("button", { name: "Elimină Fără județ" })).toBeVisible();
    expect(menuButton("Stare")).toHaveTextContent("Stare Starea 2110");
    await userEvent.click(menuButton("Stare"));
    expect(ticked()).toEqual(["În funcțiune", "Insolvență", "Radiată", "Întrerupere temporară", "Starea 2110 ✓"]);
  });
});
