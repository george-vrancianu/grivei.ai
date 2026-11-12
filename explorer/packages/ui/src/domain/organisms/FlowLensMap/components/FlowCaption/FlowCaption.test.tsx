import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { FlowCaption } from "./index.ts";

const copy = sampleCopy.flowLensMap("en").caption;

describe("FlowCaption", () => {
  it("names the direction and the home county, then points to the tiles", () => {
    const { container } = render(<FlowCaption role="authority" homeName="Brașov" localOnly={false} copy={copy} />);
    expect(container).toHaveTextContent("Where this authority's money goes: suppliers across Romania, flowing out of Brașov. Money that no county holds is on the tiles beside the map.");
  });

  it("says it is all local", () => {
    const { container } = render(<FlowCaption role="supplier" homeName="Cluj" localOnly copy={copy} />);
    expect(container).toHaveTextContent("a single bubble and no arcs");
  });

  it("says there are no arcs without a home county, which wins over local-only", () => {
    const { container } = render(<FlowCaption role="supplier" homeName={null} localOnly copy={copy} />);
    expect(container).toHaveTextContent("This supplier's county is not known: bubbles only, no arcs.");
  });
});
