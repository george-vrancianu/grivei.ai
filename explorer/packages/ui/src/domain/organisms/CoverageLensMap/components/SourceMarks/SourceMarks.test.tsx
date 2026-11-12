import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { sampleSources, typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { SourceMarks } from "./index.ts";

const centroids = new Map<string, readonly [number, number]>([["RO-BV", [30, 15]], ["RO-GL", [90, 15]]]);

describe("SourceMarks", () => {
  it("marks the harvested Source by the county's status and planned Sources as planned", () => {
    const { container } = render(
      <svg><SourceMarks centroids={centroids} sources={sampleSources} coverage={coverageByCounty(typicalCoverage.coverage)} copy={sampleCopy.coverageLensMap("en")} /></svg>,
    );
    const states = (code: string) => [...container.querySelectorAll(`[data-county="${code}"] rect`)].map((rect) => rect.getAttribute("data-state"));
    expect(states("RO-BV")).toEqual(["HARVESTED", "planned", "planned", "planned", "planned"]);
    expect(states("RO-GL")).toEqual(["none", "planned", "planned", "planned", "planned"]);
  });

  it("is hidden from assistive tech and ignores the pointer", () => {
    const { container } = render(
      <svg><SourceMarks centroids={centroids} sources={sampleSources} coverage={new Map()} copy={sampleCopy.coverageLensMap("en")} /></svg>,
    );
    const group = container.querySelector("[data-source-marks]");
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("pointer-events", "none");
  });
});
