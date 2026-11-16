import { color } from "./tokens.ts";

/** The strip's share of the ground colour laid over the panel. */
const GROUND_SHARE = 0.35;

const channels = (hex: string) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));

/** The strip fill: the ground colour at 35% (translucent, over the panel). The filter strip, the panel's header and foot and a table's head row take it. */
export const STRIP_FILL = `rgba(${channels(color.bg).join(", ")}, ${GROUND_SHARE})`;

/** The same fill as one solid colour (the ground at 35% over the panel), for an edge fade to end in. */
export const STRIP_FILL_SOLID = `rgb(${channels(color.bg)
  .map((ground, at) => Math.round(ground * GROUND_SHARE + channels(color.panel)[at]! * (1 - GROUND_SHARE)))
  .join(", ")})`;

/** `STRIP_FILL_SOLID` at zero opacity, the fade's transparent end. */
export const STRIP_FILL_CLEAR = STRIP_FILL_SOLID.replace("rgb(", "rgba(").replace(")", ", 0)");
