import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { YearRange } from "./index.ts";

const copy = sampleCopy.filterChips("en").year;
const setup = (filter = {}, firstYear = 2021, lastYear = 2025) => {
  const onFromYear = vi.fn();
  const onToYear = vi.fn();
  render(<YearRange filter={filter} firstYear={firstYear} lastYear={lastYear} onFromYear={onFromYear} onToYear={onToYear} copy={copy} />);
  return { onFromYear, onToYear };
};

describe("YearRange", () => {
  it("offers the years of the range and an empty choice in both selects", () => {
    setup();
    expect(screen.getByRole("group", { name: "Award year" })).toBeVisible();
    for (const name of ["From year", "To year"]) {
      const select = screen.getByRole("combobox", { name });
      expect(Array.from((select as HTMLSelectElement).options).map((o) => o.text)).toEqual(["Any", "2021", "2022", "2023", "2024", "2025"]);
    }
  });

  it("reflects the years of the filter, also for dates that are not year edges", () => {
    setup({ from: "2022-01-01", to: "2024-06-30" });
    expect(screen.getByRole("combobox", { name: "From year" })).toHaveValue("2022");
    expect(screen.getByRole("combobox", { name: "To year" })).toHaveValue("2024");
  });

  it("reports each end's year, and undefined for Any", async () => {
    const { onFromYear, onToYear } = setup({ from: "2022-01-01", to: "2024-12-31" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "From year" }), "2023");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "To year" }), "2025");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "To year" }), "Any");
    expect(onFromYear).toHaveBeenCalledExactlyOnceWith(2023);
    expect(onToYear.mock.calls).toEqual([[2025], [undefined]]);
  });

  it("keeps a year outside the range selectable so the filter stays reflected", () => {
    setup({ from: "2019-01-01" }, 2021, 2022);
    expect(screen.getByRole("combobox", { name: "From year" })).toHaveValue("2019");
  });
});
