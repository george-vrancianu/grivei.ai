import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { samplePageContent } from "../../../../samples/coverageGrid.ts";
import { explainedCells } from "../../../../utils/coverageGrid.ts";
import { KnownGapsTable } from "./index.ts";

const show = (cells = explainedCells(samplePageContent().cells), locale: "en" | "ro" = "en") => render(<KnownGapsTable cells={cells} locale={locale} copy={sampleCopy.coveragePageLayout(locale)} />);

describe("the known-gaps table", () => {
  it("is a table named by the heading, in a scroll region of its own name, with the intro above it", () => {
    show();
    expect(screen.getByText(/^Every cell that is a known gap/)).toBeVisible();
    expect(screen.getByRole("table", { name: "Known gaps" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Known gaps by quarter and record kind" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Known gaps" })).toBeNull();
  });

  it("gives each row its state's name and an aria-hidden swatch with no glyph text", () => {
    show();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const swatch = row.querySelector("[data-swatch]")!;
      expect(swatch).toHaveAttribute("aria-hidden", "true");
      expect(swatch.textContent).toBe("");
      expect(swatch.getAttribute("data-swatch")).toBe(row.getAttribute("data-state"));
    }
    expect(within(rows[0]!).getByText(/Known gap|Possibly incomplete|Not visible in the source/)).toBeVisible();
  });

  it("says so, with no table, when there is nothing to list", () => {
    show([]);
    expect(screen.getByText("No known gaps in the data shown.")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("reads in Romanian", () => {
    show(undefined, "ro");
    expect(screen.getByRole("table", { name: "Lacune cunoscute" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Trimestru" })).toBeVisible();
  });
});
