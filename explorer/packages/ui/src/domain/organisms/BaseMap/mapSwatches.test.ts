import { describe, expect, it } from "vitest";
import { color, map } from "../../../theme/tokens.ts";
import { COVERAGE_COLORS, MARK_OUTLINE, NO_STATUS_COLOR, OTHER_HARVESTED_MARK_COLOR, PLANNED_MARK_COLOR } from "../CoverageLensMap/index.ts";
import { ARC_COLOR, ARC_OPACITY, ARROWHEAD_OPACITY, BUBBLE_FILL, BUBBLE_OUTLINE, HOME_COLOR, OTHER_COLOR } from "../FlowLensMap/flowLensMap.utils.ts";
import { createColorScale, NO_DATA_COLOR, NONE_OUTLINE } from "./baseMap.utils.ts";

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
/** The colour a mark shows once drawn at `opacity` over the panel (what the eye sees, not the opaque value). */
const overPanel = (value: string, opacity: number) => {
  const channel = (hexValue: string, offset: number) => parseInt(hexValue.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) => Math.round(opacity * channel(value, offset) + (1 - opacity) * channel(color.panel, offset)));
  return `#${mixed.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
};
const hex = (css: string) => {
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(css);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : css;
};

/** Every colour a map draws as a swatch or a mark, on the panel the map sits on. */
const ramp = createColorScale("linear", [0, 1]).ramp(9).map(hex);
const swatches: Record<string, string> = {
  "ramp low": ramp[0]!,
  "ramp high": ramp[8]!,
  ...Object.fromEntries(Object.entries(COVERAGE_COLORS).map(([status, value]) => [`coverage ${status}`, value])),
  "planned mark": PLANNED_MARK_COLOR,
  "other harvested mark": OTHER_HARVESTED_MARK_COLOR,
  "flow home": HOME_COLOR,
  "flow other": OTHER_COLOR,
  "flow bubble": BUBBLE_FILL,
  // The bubble's fill is drawn at 0.55 and is 1.8:1 as drawn; its full-opacity outline (this entry) carries the 3:1.
  "flow bubble outline": BUBBLE_OUTLINE,
  "flow arc as drawn": overPanel(ARC_COLOR, ARC_OPACITY),
  "flow arrowhead as drawn": overPanel(ARC_COLOR, ARROWHEAD_OPACITY),
};

/** The "none" fills are the handoff's dark slate (close to the panel by design): their swatches carry an outline that must reach 3:1 instead. */
const outlined: Record<string, string> = { "no data": NO_DATA_COLOR, "no coverage status": NO_STATUS_COLOR };

describe("map swatches on the panel", () => {
  it.each(Object.entries(swatches))("%s reaches 3:1 against the panel", (_name, value) => {
    expect(contrast(value, color.panel)).toBeGreaterThanOrEqual(3);
  });

  it("recorded exception: a none fill is the token and its swatch outline reaches 3:1", () => {
    for (const value of Object.values(outlined)) expect(value).toBe(map.none);
    expect(contrast(NONE_OUTLINE, color.panel)).toBeGreaterThanOrEqual(3);
  });

  it("the mark outline is dark so a mark reads on every status fill", () => {
    expect(MARK_OUTLINE).toBe(color.bg);
  });
});
