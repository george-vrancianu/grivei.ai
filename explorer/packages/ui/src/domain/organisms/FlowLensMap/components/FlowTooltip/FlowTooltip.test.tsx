import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { supplierNationwideFlow } from "../../../../samples/flowMaps.ts";
import { FlowTooltip } from "./index.ts";

const total = supplierNationwideFlow.counties[0]!.total;
const base = { name: "Brașov", total, role: "supplier", isHome: false, homeName: "Cluj", locale: "en", copy: sampleCopy.flowLensMap("en") } as const;

describe("FlowTooltip", () => {
  it("gives the name, the exact money, the Records and the direction", () => {
    const { container } = render(<FlowTooltip {...base} />);
    expect(container).toHaveTextContent("Brașov");
    expect(container).toHaveTextContent("RON 2,800,000");
    expect(container).toHaveTextContent("40 Records");
    expect(container).toHaveTextContent("Money flows in to Cluj");
  });

  it("marks the home county instead of giving a direction", () => {
    const { container } = render(<FlowTooltip {...base} isHome />);
    expect(container).toHaveTextContent("The entity's county");
    expect(container).not.toHaveTextContent("Money flows");
  });

  it("says no money for a county without a row, and claims no direction", () => {
    const { container } = render(<FlowTooltip {...base} total={undefined} />);
    expect(container).toHaveTextContent("No money");
    expect(container).not.toHaveTextContent("Money flows");
  });

  it("claims no direction without a home county", () => {
    const { container } = render(<FlowTooltip {...base} homeName={null} />);
    expect(container).not.toHaveTextContent("Money flows");
  });
});
