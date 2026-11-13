import type { CSSProperties } from "react";
import type { ColorName, font as fontTokens, layout as layoutTokens, radius as radiusTokens, size as sizeTokens } from "./tokens.ts";
import type { GrafStates } from "./states.ts";

/** What the theme adds to MUI's: the token colours, radii, control heights, font stacks and shared state treatments. */
export interface GrafTheme {
  radius: typeof radiusTokens;
  size: typeof sizeTokens;
  font: typeof fontTokens;
  layout: typeof layoutTokens;
  states: GrafStates;
}

export type GrafColors = Readonly<Record<ColorName, string>>;

declare module "@mui/material/styles" {
  interface Palette {
    /** Every colour token by name (`bg`, `panel`, `line`, `lineStrong`, `text`, `text2`, `muted`, `accent`, `idle`, ...). `idle` is for marks and dashed lines only, never text. */
    graf: GrafColors;
  }
  interface PaletteOptions {
    graf?: GrafColors;
  }
  interface Theme {
    graf: GrafTheme;
  }
  interface ThemeOptions {
    graf?: GrafTheme;
  }
  interface TypographyVariants {
    /** An amount of money: Plex Mono, semibold, tabular figures. */
    money: CSSProperties;
    /** The lead paragraph under a page title: 17 px, text2. */
    lead: CSSProperties;
    /** Nav, chips, toggles and section labels. */
    label: CSSProperties;
    /** Codes, dates, legends and badges. */
    meta: CSSProperties;
    /** The headline total: the only amber number. */
    total: CSSProperties;
    /** A big number in a stat. */
    stat: CSSProperties;
  }
  interface TypographyVariantsOptions {
    money?: CSSProperties;
    lead?: CSSProperties;
    label?: CSSProperties;
    meta?: CSSProperties;
    total?: CSSProperties;
    stat?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    money: true;
    lead: true;
    label: true;
    meta: true;
    total: true;
    stat: true;
  }
}
