import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { nothingHarvestedCoverage, typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { CoverageTiles } from "./index.ts";

describe("CoverageTiles", () => {
  it("shows National's status, and Unplaced's count, Records and Total in Romanian", async () => {
    const onSelect = vi.fn();
    render(<CoverageTiles lens={typicalCoverage} coverage={coverageByCounty(typicalCoverage.coverage)} onSelect={onSelect} locale="ro" copy={sampleCopy.coverageLensMap("ro")} />);
    expect(screen.getByRole("button", { name: /^Național/ })).toHaveTextContent("Colectat");
    const tile = screen.getByRole("button", { name: /^Autorități neplasate/ });
    expect(tile).toHaveTextContent("17 autorități fără județ");
    expect(tile).toHaveTextContent("12.000.000 RON");
    expect(tile).toHaveTextContent("130 de înregistrări");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("UNPLACED");
  });

  it("draws only National when nothing is unplaced", () => {
    render(<CoverageTiles lens={nothingHarvestedCoverage} coverage={coverageByCounty(nothingHarvestedCoverage.coverage)} onSelect={() => {}} locale="en" copy={sampleCopy.coverageLensMap("en")} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^National/ })).toHaveTextContent("Not harvested");
  });
});
