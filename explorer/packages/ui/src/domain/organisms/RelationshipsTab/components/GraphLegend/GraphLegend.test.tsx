import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { GraphLegend } from "./index.ts";

const copy = sampleCopy.relationshipsTab("en").legend;

describe("GraphLegend", () => {
  it("always explains the centre, the size and the two channel colours", () => {
    renderInUi(<GraphLegend copy={copy} hasWonTogether={false} hasSignals={false} />);
    for (const text of [copy.centre, copy.size, copy.contract, copy.directPurchase]) expect(screen.getByText(text)).toBeVisible();
    expect(screen.queryByText(copy.wonTogether)).toBeNull();
    expect(screen.queryByText(copy.signals)).toBeNull();
  });
  it("adds the dashed edge and the ring when the graph uses them", () => {
    renderInUi(<GraphLegend copy={copy} hasWonTogether hasSignals />);
    expect(screen.getByText(copy.wonTogether)).toBeVisible();
    expect(screen.getByText(copy.signals)).toBeVisible();
  });
});
