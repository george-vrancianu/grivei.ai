import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { sampleSources } from "../../../../samples/coverageLenses.ts";
import { CoverageLegend } from "./index.ts";

describe("CoverageLegend", () => {
  it("lists the four statuses and the no-status swatch, each with its word", () => {
    render(<CoverageLegend sources={sampleSources} copy={sampleCopy.coverageLensMap("en")} />);
    expect(screen.getAllByRole("listitem").filter((item) => item.hasAttribute("data-status"))).toHaveLength(5);
    expect(screen.getByText("Not harvested")).toBeVisible();
  });

  it("explains the marks in Romanian, planned Sources greyed", () => {
    render(<CoverageLegend sources={sampleSources} copy={sampleCopy.coverageLensMap("ro")} />);
    expect(screen.getByText("SEAP: culoarea arată starea județului")).toBeVisible();
    expect(screen.getByText(/^Necolectate încă: ONRC, ANI/)).toBeVisible();
  });

  it("omits the planned line when every Source is harvested", () => {
    render(<CoverageLegend sources={sampleSources.map((s) => ({ ...s, harvested: true }))} copy={sampleCopy.coverageLensMap("en")} />);
    const marks = screen.getByRole("region");
    expect(within(marks).queryByText(/Not harvested yet/)).toBeNull();
  });
});
