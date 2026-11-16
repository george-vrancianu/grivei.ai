/** A `#rrggbb` token as the `rgb(r, g, b)` string `getComputedStyle` reports. */
export const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
