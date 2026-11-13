/**
 * A font size for a number that never breaks: at most `max`, shrinking with the width of the box it sits in (a container query unit, so the
 * box needs `containerType: "inline-size"`). The longest amount ("RON 99,999,999,999") is 18 characters of Plex Mono, about 0.6 em each:
 * 9cqi x 18 x 0.6 = 97% of the box, so it fits at any width, a 390 px phone included. Where `cqi` is unknown the declaration is dropped and the theme's size stands.
 */
export const fitSize = (max: string): string => `clamp(18px, 9cqi, ${max})`;
