import type { CSSObject } from "@mui/material/styles";
import { color, map } from "./tokens.ts";

/**
 * The shared state treatments on the dark ground, as style fragments. The theme applies them to buttons, links, chips,
 * toggles and tabs; a component that is not a MUI control (a map area, a tile) spreads the fragment it needs.
 * Only colour, outline and fill: size and shape stay with the component.
 */
export interface GrafStates {
  /** The keyboard focus ring: 2 px light outline, 2 px off the control, visible on `bg` and on `panel`. */
  focusRing: CSSObject;
  /** Hover: the `line` fill and full-strength text. */
  hover: CSSObject;
  /** Pressed (while the pointer is down): the `lineStrong` fill. */
  pressed: CSSObject;
  /** Selected or toggled on: the `line` fill, full-strength text and an accent outline, so it differs from hover. */
  selected: CSSObject;
  /** The same treatments for an SVG area (a map): outlines only, since the fill carries the data. Selected is a solid outline, focus a dashed one, so the two read apart. */
  mapArea: {
    hover: CSSObject;
    selected: CSSObject;
    focus: CSSObject;
  };
}

export const focusRing: CSSObject = { outline: `2px solid ${color.text}`, outlineOffset: 2 };
export const hover: CSSObject = { backgroundColor: color.line, color: color.text };
export const pressed: CSSObject = { backgroundColor: color.lineStrong, color: color.text };
export const selected: CSSObject = { backgroundColor: color.line, color: color.text, boxShadow: `inset 0 0 0 1px ${color.accent}` };

export const grafStates: GrafStates = {
  focusRing,
  hover,
  pressed,
  selected,
  mapArea: {
    hover: { stroke: map.highlight, strokeWidth: 1.5 },
    selected: { stroke: map.highlight, strokeWidth: 3 },
    focus: { stroke: map.highlight, strokeWidth: 3, strokeDasharray: "6 3" },
  },
};
