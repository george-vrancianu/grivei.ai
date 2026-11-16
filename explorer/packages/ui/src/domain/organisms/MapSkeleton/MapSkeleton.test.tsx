import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { MapSkeleton } from "./index.ts";

describe("MapSkeleton", () => {
  it("draws the outlines' areas in a neutral fill, never the choropleth's colours, with the status chip", () => {
    const { container } = renderInUi(<MapSkeleton topology={countiesTopology} label="Loading…" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    const areas = svg?.querySelectorAll("path") ?? [];
    expect(areas.length).toBeGreaterThan(1);
    for (const area of areas) expect(area).not.toHaveAttribute("fill");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("is a map-sized block while the outlines load, still with the status chip", () => {
    const { container } = renderInUi(<MapSkeleton label="Se încarcă…" />, "ro");
    expect(container.querySelector("path")).toBeNull();
    const block = container.querySelector(".MuiSkeleton-root");
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Se încarcă…");
  });
});
