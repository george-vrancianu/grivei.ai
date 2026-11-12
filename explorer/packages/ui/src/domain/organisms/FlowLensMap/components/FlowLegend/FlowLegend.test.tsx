import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { FlowLegend } from "./index.ts";

const copy = (locale: "en" | "ro") => sampleCopy.flowLensMap(locale).legend;

describe("FlowLegend", () => {
  it("says the arrow goes in for a supplier and out for an authority", () => {
    const { rerender } = render(<FlowLegend role="supplier" hasHome copy={copy("en")} />);
    expect(screen.getByText("Arrow: money flows in to the supplier's county")).toBeVisible();
    rerender(<FlowLegend role="authority" hasHome copy={copy("en")} />);
    expect(screen.getByText("Arrow: money flows out of the authority's county")).toBeVisible();
  });

  it("lists bubble, arc, direction, home and other entries with a home county, and only bubble and other without", () => {
    const { rerender, container } = render(<FlowLegend role="supplier" hasHome copy={copy("en")} />);
    expect([...container.querySelectorAll("[data-legend]")].map((e) => e.getAttribute("data-legend"))).toEqual(["bubble", "arc", "direction", "home", "other"]);
    rerender(<FlowLegend role="supplier" hasHome={false} copy={copy("en")} />);
    expect([...container.querySelectorAll("[data-legend]")].map((e) => e.getAttribute("data-legend"))).toEqual(["bubble", "other"]);
  });

  it("reads in Romanian", () => {
    render(<FlowLegend role="supplier" hasHome copy={copy("ro")} />);
    expect(screen.getByText("Aria cercului: banii din județ")).toBeVisible();
  });
});
