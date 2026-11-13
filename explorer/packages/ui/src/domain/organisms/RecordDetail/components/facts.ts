import { color, font, type } from "../../../../theme/tokens.ts";

/** A definition list laid out as label / value pairs (a mono muted label, then the value), shared by the panels of the Record page. The label stands above its value on a narrow screen. */
export const factsSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "max-content minmax(0, 1fr)" },
  columnGap: 3,
  rowGap: { xs: 0, sm: 1 },
  m: 0,
  "& dt": { color: color.muted, fontFamily: font.mono, fontSize: type.meta.size, lineHeight: type.body.lineHeight },
  "& dd": { m: 0, mb: { xs: 1, sm: 0 }, minWidth: 0, overflowWrap: "anywhere" },
} as const;
