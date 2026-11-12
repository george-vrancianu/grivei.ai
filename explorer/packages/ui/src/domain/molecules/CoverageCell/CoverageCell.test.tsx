import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import type { GapCellData } from "../../types.ts";
import { CoverageCell } from "./index.ts";

const cell: GapCellData = { quarter: "2024-Q4", kind: "CONTRACT", state: "POSSIBLY_INCOMPLETE", rule: "COUNT_BELOW_NEIGHBOURS", note: null, records: 18_400, dataThrough: null };
const show = (props: Partial<Parameters<typeof CoverageCell>[0]> = {}) =>
  render(
    <table>
      <tbody>
        <tr>
          <CoverageCell cell={cell} quarter="2024-Q4" kind="CONTRACT" inRange={false} locale="en" copy={sampleCopy.coverageGrid("en")} {...props} />
        </tr>
      </tbody>
    </table>,
  );

describe("CoverageCell", () => {
  it("names the kind, quarter, state, count and reason, and shows a glyph and a short count", () => {
    show();
    const el = screen.getByRole("cell");
    expect(el).toHaveAccessibleName("Contracts, Q4 2024: Possibly incomplete. 18,400 Records. Fewer than 60% of the median row count of the surrounding quarters");
    expect(el).toHaveTextContent("?18k");
    expect(el).toHaveAttribute("data-state", "POSSIBLY_INCOMPLETE");
  });

  it("shows no text when compact, and marks the range", () => {
    show({ compact: true, inRange: true });
    const el = screen.getByRole("cell");
    expect(el.textContent).not.toMatch(/\d/);
    expect(el).toHaveAttribute("data-in-range", "true");
    expect(el).toHaveAccessibleName(/inside the date range$/);
  });

  it("says there is no information for a missing cell, using the kind's label", () => {
    show({ cell: null });
    expect(screen.getByRole("cell")).toHaveAccessibleName("Contracts, Q4 2024: no information");
  });
});
