import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { sampleGrid } from "../../samples/coverageGrid.ts";
import { CoverageGridCompact } from "./index.ts";

describe("the compact Coverage grid", () => {
  it("links to the Coverage page with the href it is given, and hands a plain click to the app", async () => {
    const onNavigate = vi.fn();
    render(<CoverageGridCompact cells={sampleGrid()} href="/ro/explore/coverage?from=2023-01-01" onNavigate={onNavigate} locale="ro" copy={sampleCopy.coverageGrid("ro")} />);
    const link = screen.getByRole("link", { name: "Vezi pagina Acoperire" });
    expect(link).toHaveAttribute("href", "/ro/explore/coverage?from=2023-01-01");
    await userEvent.setup().click(link);
    expect(onNavigate).toHaveBeenCalledWith("/ro/explore/coverage?from=2023-01-01");
  });

  it("shows no text inside the cells, but keeps each cell's accessible name and a condensed legend", () => {
    render(<CoverageGridCompact cells={sampleGrid()} href="/explore/coverage" locale="en" copy={sampleCopy.coverageGrid("en")} />);
    const cells = screen.getAllByRole("cell");
    expect(cells.length).toBe(19 * 4);
    expect(cells.every((c) => !(c.textContent ?? "").match(/\d/))).toBe(true);
    expect(screen.getByRole("cell", { name: /^Contracts, Q4 2024: Possibly incomplete/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cell states" })).toBeVisible();
  });

  it("marks the columns in the window", () => {
    render(<CoverageGridCompact cells={sampleGrid()} window={{ from: "2024-01-01", to: "2024-12-31" }} href="/explore/coverage" locale="en" copy={sampleCopy.coverageGrid("en")} />);
    expect(document.querySelectorAll("td[data-in-range]")).toHaveLength(4 * 4);
  });
});
