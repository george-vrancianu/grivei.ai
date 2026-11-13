import { createTheme, type Theme } from "@mui/material/styles";
import { enUS, roRO } from "@mui/material/locale";
import "./augmentation.ts";
import { components } from "./components.ts";
import { grafStates } from "./states.ts";
import { color, font, layout, radius, size } from "./tokens.ts";
import { typography } from "./typography.ts";

export type Locale = "en" | "ro";
export const LOCALES: readonly Locale[] = ["en", "ro"];

const muiLocales = { en: enUS, ro: roRO } as const;

/**
 * The explorer theme (A · Graf, dark), built from `tokens.json`: palette, typography, shape and component defaults.
 * The locale only selects MUI's own built-in strings (table pagination, etc.);
 * app copy lives in the app's bilingual catalogue, never here.
 */
export function createGriveiTheme(locale: Locale = "en"): Theme {
  return createTheme(
    {
      palette: {
        mode: "dark",
        primary: { main: color.accent, light: color.accentHover, dark: color.accentPressed, contrastText: color.onAccent },
        secondary: { main: color.text2, contrastText: color.bg },
        background: { default: color.bg, paper: color.panel },
        text: { primary: color.text, secondary: color.text2, disabled: color.muted },
        divider: color.line,
        graf: color,
      },
      shape: { borderRadius: radius.control },
      typography,
      components,
      graf: { radius, size, font, layout, states: grafStates },
    },
    muiLocales[locale],
  );
}
