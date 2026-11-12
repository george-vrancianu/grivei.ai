import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { CoverageFigures } from "./index.ts";

const rows = coverageByCounty(typicalCoverage.coverage);

describe("CoverageFigures", () => {
  it("says no coverage status for an area without a row, and nothing else", () => {
    const { container } = render(<CoverageFigures row={undefined} lens={typicalCoverage} locale="en" copy={sampleCopy.coverageLensMap("en")} />);
    expect(container).toHaveTextContent(/^No coverage status$/);
  });

  it("shows the status and the N of M sentence, and the note only with withNote", () => {
    const { rerender } = render(<CoverageFigures row={rows.get("RO-CJ")} lens={typicalCoverage} locale="en" copy={sampleCopy.coverageLensMap("en")} />);
    expect(screen.getByText("Harvested, with known gaps")).toBeVisible();
    expect(screen.getByText(/^400 of 480 public entities have SEAP records since 1 Jan 2021/)).toBeVisible();
    expect(screen.queryByText(/may simply have bought nothing/)).toBeNull();
    rerender(<CoverageFigures row={rows.get("RO-CJ")} lens={typicalCoverage} withNote locale="en" copy={sampleCopy.coverageLensMap("en")} />);
    expect(screen.getByText("An entity without records may simply have bought nothing.")).toBeVisible();
  });

  it("agrees the verb with the count of entities that have records, in both languages", () => {
    const row = { ...rows.get("RO-CJ")!, withRecords: 1, publicEntities: 340, otherAuthorities: 0 };
    const { rerender } = render(<CoverageFigures row={row} lens={typicalCoverage} locale="en" copy={sampleCopy.coverageLensMap("en")} />);
    expect(screen.getByText(/^1 of 340 public entities has SEAP records/)).toBeVisible();
    rerender(<CoverageFigures row={row} lens={typicalCoverage} locale="ro" copy={sampleCopy.coverageLensMap("ro")} />);
    expect(screen.getByText("1 din 340 de entități publice are înregistrări SEAP începând cu 1 ian. 2021")).toBeVisible();
  });
});
