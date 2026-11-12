import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { CoverageTooltip } from "./index.ts";

describe("CoverageTooltip", () => {
  it("shows the county name, its status, the N of M sentence and the may-have-bought-nothing note", () => {
    const row = coverageByCounty(typicalCoverage.coverage).get("RO-CJ");
    render(<CoverageTooltip name="Cluj" row={row} lens={typicalCoverage} locale="ro" copy={sampleCopy.coverageLensMap("ro")} />);
    expect(screen.getByText("Cluj")).toBeVisible();
    expect(screen.getByText("Colectat, cu lacune cunoscute")).toBeVisible();
    expect(screen.getByText(/^400 din 480 de entități publice au înregistrări SEAP începând cu 1 ian. 2021/)).toBeVisible();
    expect(screen.getByText("O entitate fără înregistrări poate pur și simplu să nu fi cumpărat nimic.")).toBeVisible();
  });
});
