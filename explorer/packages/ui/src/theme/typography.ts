import type { TypographyVariantsOptions } from "@mui/material/styles";
import { color, font, type } from "./tokens.ts";

const title = { fontFamily: font.display, fontWeight: type.pageTitle.weight, letterSpacing: type.pageTitle.letterSpacing } as const;

/** The type scale: Space Grotesk 600 for titles and big numbers, Inter for text, IBM Plex Mono for labels and codes, and a `money` variant (Plex Mono, tabular figures). */
export const typography: TypographyVariantsOptions = {
  fontFamily: font.body,
  h1: { ...title, fontSize: type.pageTitle.size, lineHeight: type.pageTitle.lineHeight },
  h2: { ...title, fontSize: "24px", lineHeight: 1.2 },
  h3: { ...title, fontSize: "19px", lineHeight: 1.25, letterSpacing: 0 },
  h4: { ...title, fontSize: "17px", lineHeight: 1.3, letterSpacing: 0 },
  h5: { ...title, fontSize: "16px", lineHeight: 1.3, letterSpacing: 0 },
  h6: { ...title, fontSize: "15px", lineHeight: 1.3, letterSpacing: 0 },
  subtitle1: { fontFamily: font.body, fontSize: type.rowTitle.size, fontWeight: type.rowTitle.weight, lineHeight: type.body.lineHeight },
  subtitle2: { fontFamily: font.body, fontSize: "13px", fontWeight: type.rowTitle.weight, lineHeight: type.body.lineHeight },
  body1: { fontFamily: font.body, fontSize: type.body.size, fontWeight: type.body.weight, lineHeight: type.body.lineHeight },
  body2: { fontFamily: font.body, fontSize: "13px", fontWeight: type.body.weight, lineHeight: type.body.lineHeight },
  caption: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, lineHeight: 1.5, color: color.muted },
  overline: { fontFamily: font.mono, fontSize: type.label.size, fontWeight: type.label.weight, lineHeight: type.body.lineHeight, textTransform: "none", letterSpacing: 0 },
  button: { fontFamily: font.mono, fontSize: type.label.size, fontWeight: 600, textTransform: "none", letterSpacing: 0 },
  label: { fontFamily: font.mono, fontSize: type.label.size, fontWeight: type.label.weight, lineHeight: type.body.lineHeight, color: color.text2 },
  meta: { fontFamily: font.mono, fontSize: type.meta.size, fontWeight: type.meta.weight, lineHeight: 1.5, color: color.muted },
  money: { fontFamily: font.mono, fontSize: type.money.size, fontWeight: type.money.weight, fontVariantNumeric: type.money.numeric },
  total: { ...title, fontSize: type.total.size, lineHeight: type.total.lineHeight, color: color.accent },
  stat: { ...title, fontSize: type.stat.size, lineHeight: type.stat.lineHeight },
};
