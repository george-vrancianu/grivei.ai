import tokensJson from "./tokens.json";

/**
 * The design tokens, read from `tokens.json` (the A · Graf handoff, moved here as the one source of truth).
 * Nothing in the theme or in a component restates a colour, a radius, a size or a font stack: it comes from here.
 */
export type ColorName = keyof typeof tokensJson.color;

const valueOf = (entry: { value: string }) => entry.value;

/** Colour tokens by name, as hex strings. */
export const color = Object.fromEntries(Object.entries(tokensJson.color).map(([name, entry]) => [name, valueOf(entry)])) as Record<ColorName, string>;

/** Font stacks: `display` (Space Grotesk), `body` (Inter) and `mono` (IBM Plex Mono). */
export const font = tokensJson.font;

/** Corner radii in px: cell, chip, control, card, signalPill, filterPill. */
export const radius = tokensJson.radius;

/** Control and mark sizes in px: badgeChip 32, toggle 36, filterChip 40, primaryAction 44, tab 48, searchInput 56 and others. */
export const size = tokensJson.size;

/** The type scale entries (font, size, weight, line height, letter spacing) the typography variants are built from. */
export const type = tokensJson.type;

/** Map colours: the five-class ramp, the "none" fill, the gap stroke and the highlight outline. */
export const map = {
  ramp: tokensJson.map.ramp,
  none: tokensJson.map.none.value,
  gap: tokensJson.map.gap.value,
  highlight: tokensJson.map.highlight.value,
} as const;

/** The layout limits of a page. */
export const layout = tokensJson.layout;

/** The dot grid on the page background: one dot every 24 px, in `bgDot`. */
export const dotGridSize = 24;
