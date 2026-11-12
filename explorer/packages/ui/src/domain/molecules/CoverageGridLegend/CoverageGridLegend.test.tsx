import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { CoverageGridLegend } from "./index.ts";

describe("CoverageGridLegend", () => {
  it("lists the six states by name, and no range swatch by default", () => {
    render(<CoverageGridLegend copy={sampleCopy.coverageGrid("en")} />);
    const items = within(screen.getByRole("region", { name: "Cell states" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent?.replace(/^\S/, "").trim())).toEqual(["Loaded", "Known gap", "Possibly incomplete", "Not visible in the source", "Crawled, provisional", "Not yet loaded"]);
  });

  it("adds the range swatch when asked, and reads in Romanian", () => {
    render(<CoverageGridLegend copy={sampleCopy.coverageGrid("ro")} showRange condensed />);
    expect(screen.getByText("În intervalul de date")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });
});
