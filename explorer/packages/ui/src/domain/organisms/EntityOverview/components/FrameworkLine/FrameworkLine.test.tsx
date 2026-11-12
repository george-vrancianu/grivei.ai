import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityManyCounterpartiesOverview, emptyOverview } from "../../../../samples/fixtureData.ts";
import { FrameworkLine } from "./index.ts";

const show = (frameworks: typeof emptyOverview.overview.frameworks) =>
  renderInUi(<FrameworkLine frameworks={frameworks} locale="en" copy={sampleCopy.entityOverview("en").frameworks} />);

describe("FrameworkLine", () => {
  it("gives the count, the ceilings and the subsequent contracts reported, and says ceilings are not in the total", () => {
    show(authorityManyCounterpartiesOverview.overview.frameworks);
    expect(screen.getByText("4 framework agreements, ceilings RON 100,000,000, reported subsequent contracts RON 112,400,000")).toBeVisible();
    expect(screen.getByText(/not in the total/)).toBeVisible();
  });

  it("is a sentence when there are no framework agreements", () => {
    show(emptyOverview.overview.frameworks);
    expect(screen.getByText("No framework agreements.")).toBeVisible();
  });
});
