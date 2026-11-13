import type { TypographyVariantsOptions } from "@mui/material/styles";
import { color, font, type } from "./tokens.ts";

const title = { fontFamily: font.display, fontWeight: type.pageTitle.weight, letterSpacing: type.pageTitle.letterSpacing } as const;

/** The type scale: Space Grotesk 600 for titles and big numbers, Inter for text, IBM Plex Mono for labels and codes, and a `money` variant (Plex Mono, tabular figures). */
export const typography: TypographyVariantsOptions = {
  fontFamily: font.body,
  h1: { ...title, fontSize: type.pageTitle.size, lineHeight: type.pageTitle.lineHeight },
  h2: { ...title, fontSize: type.cardTitle.max, lineHeight: type.cardTitle.lineHeight },
  h3: { ...title, fontSize: type.cardTitle.min, lineHeight: type.cardTitle.lineHeight, letterSpacing: 0 },
  h4: { ...title, fontSize: type.subheading.sizes[0], lineHeight: type.subheading.lineHeight, letterSpacing: 0 },
  h5: { ...title, fontSize: type.subheading.sizes[1], lineHeight: type.subheading.lineHeight, letterSpacing: 0 },
  h6: { ...title, fontSize: type.subheading.sizes[2], lineHeight: type.subheading.lineHeight, letterSpacing: 0 },
  subtitle1: { fontFamily: font.body, fontSize: type.rowTitle.size, fontWeight: type.rowTitle.weight, lineHeight: type.body.lineHeight },
  subtitle2: { fontFamily: font.body, fontSize: type.small.min, fontWeight: type.rowTitle.weight, lineHeight: type.body.lineHeight },
  body1: { fontFamily: font.body, fontSize: type.body.size, fontWeight: type.body.weight, lineHeight: type.body.lineHeight },
  body2: { fontFamily: font.body, fontSize: type.small.min, fontWeight: type.body.weight, lineHeight: type.body.lineHeight },
  caption: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, lineHeight: type.meta.lineHeight, color: color.muted },
  overline: { fontFamily: font.mono, fontSize: type.label.size, fontWeight: type.label.weight, lineHeight: type.body.lineHeight, textTransform: "none", letterSpacing: 0 },
  button: { fontFamily: font.mono, fontSize: type.button.size, fontWeight: type.button.weight, textTransform: "none", letterSpacing: 0 },
  label: { fontFamily: font.mono, fontSize: type.label.size, fontWeight: type.label.weight, lineHeight: type.body.lineHeight, color: color.text2 },
  meta: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, lineHeight: type.meta.lineHeight, color: color.muted },
  money: { fontFamily: font.mono, fontSize: type.money.size, fontWeight: type.money.weight, fontVariantNumeric: type.money.numeric },
  total: { ...title, fontSize: type.total.size, lineHeight: type.total.lineHeight, color: color.accent },
  stat: { ...title, fontSize: type.stat.size, lineHeight: type.stat.lineHeight },
};
