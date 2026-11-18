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

/** Shadows: panel (cards), raised (outlined buttons), overlay (menus, popovers, tooltips), well (inset areas) and header (the sticky header). */
export const shadow = tokensJson.shadow;

/** The shadow of the logo disc in the header. */
export const logoShadow = tokensJson.logoShadow;

/** The translucent fill of the sticky header and the footer: `bg` at 86%, seen through a blur. */
export const headerFill = tokensJson.headerFill;

/** The type scale entries (font, size, weight, line height, letter spacing) the typography variants are built from. */
export const type = tokensJson.type;

/** Map colours: the five-class ramp, the "none" fill, the gap stroke and the highlight outline. */
export const map = {
  ramp: tokensJson.map.ramp,
  none: tokensJson.map.none.value,
  gap: tokensJson.map.gap.value,
  highlight: tokensJson.map.highlight.value,
} as const;

const { headerHeight, headerClearance } = tokensJson.layout;

/**
 * The layout limits of a page, and what hangs off the sticky header's height (`headerHeight`: one row of the 48 px logo, 12 px above and below, the 1 px border; the app's `Header` is that tall from `md`).
 * `headerStickyTop` is where a sticky panel stops under it (the height and a `headerClearance` gap); `headerScrollPadding` is the room an in-page anchor and the scroll-spy leave (the height and two gaps).
 */
export const layout = {
  ...tokensJson.layout,
  headerStickyTop: headerHeight + headerClearance,
  headerScrollPadding: headerHeight + 2 * headerClearance,
} as const;

/** Coverage grid colours and sizes (cell, gap, font, swatch): harvested, the known-gap stripes, possibly incomplete, awaiting the bulk file. A state is never colour alone (glyph, stripe or border). */
export const coverage = tokensJson.coverage;
