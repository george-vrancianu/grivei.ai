import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { YearMenu } from "./index.ts";

const sample = sampleCopy.filterChips("en");
const setup = (filter = {}, firstYear = 2021, lastYear = 2025) => {
  const onFromYear = vi.fn();
  const onToYear = vi.fn();
  renderInUi(
    <YearMenu filter={filter} firstYear={firstYear} lastYear={lastYear} onFromYear={onFromYear} onToYear={onToYear} copy={sample.year} unsetLabel={sample.menuAny} />,
  );
  return { onFromYear, onToYear };
};
// While the menu is open the rest of the page is aria-hidden, the button included.
const button = () => screen.getByRole("button", { name: /Award year/, hidden: true });
const open = () => userEvent.click(button());
const item = (name: string) => screen.getByRole("menuitemradio", { name });

describe("YearMenu", () => {
  it("shows the group and Any while neither end is set", () => {
    setup();
    expect(button()).toHaveTextContent("Award year Any");
  });

  it.each([
    [{ from: "2023-01-01" }, "from 2023"],
    [{ to: "2025-12-31" }, "until 2025"],
    [{ from: "2023-01-01", to: "2025-12-31" }, "2023–2025"],
    [{ from: "2024-01-01", to: "2024-12-31" }, "2024"],
  ])("words %j on the button as %s", (filter, text) => {
    setup(filter);
    expect(button()).toHaveTextContent(`Award year ${text}`);
  });

  it("offers Any then the years in each of two columns, headed From year and To year", async () => {
    setup();
    await open();
    expect(screen.getByRole("menu", { name: /Award year/ })).toBeVisible();
    expect(screen.getByText("From year")).toBeVisible();
    expect(screen.getByText("To year")).toBeVisible();
    for (const heading of ["From year", "To year"]) {
      for (const name of ["Any", "2021", "2022", "2023", "2024", "2025"]) expect(item(`${heading} ${name}`)).toBeVisible();
    }
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(12);
  });

  it("lays the items out as two columns that flow by column", async () => {
    setup();
    await open();
    const list = screen.getByRole("menu");
    const style = getComputedStyle(list);
    expect(style.display).toBe("grid");
    expect(style.gridAutoFlow).toBe("column");
    expect(style.gridTemplateRows).toBe("repeat(7, auto)");
  });

  it("reflects the years of the filter, also for dates that are not year edges", async () => {
    setup({ from: "2022-01-01", to: "2024-06-30" });
    await open();
    expect(item("From year 2022")).toHaveAttribute("aria-checked", "true");
    expect(item("To year 2024")).toHaveAttribute("aria-checked", "true");
    expect(item("From year Any")).toHaveAttribute("aria-checked", "false");
  });

  it("reports each end's year, and undefined for Any, and stays open", async () => {
    const { onFromYear, onToYear } = setup({ from: "2022-01-01", to: "2024-12-31" });
    await open();
    await userEvent.click(item("From year 2023"));
    await userEvent.click(item("To year 2025"));
    await userEvent.click(item("To year Any"));
    expect(onFromYear).toHaveBeenCalledExactlyOnceWith(2023);
    expect(onToYear.mock.calls).toEqual([[2025], [undefined]]);
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("keeps a year outside the range selectable so the filter stays reflected", async () => {
    setup({ from: "2019-01-01" }, 2021, 2022);
    await open();
    expect(item("From year 2019")).toHaveAttribute("aria-checked", "true");
  });

  it("moves down a column with the arrows and carries on into the next, skipping the headings", async () => {
    setup({}, 2021, 2022);
    await open();
    expect(item("From year Any")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(item("From year 2022")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(item("To year Any")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(item("From year 2022")).toHaveFocus();
  });

  it("closes on Escape and returns focus to the button", async () => {
    setup();
    await open();
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(button()).toHaveFocus();
  });
});
