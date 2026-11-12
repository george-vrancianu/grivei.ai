import { createTheme, type Theme } from "@mui/material/styles";
import { enUS, roRO } from "@mui/material/locale";

export type Locale = "en" | "ro";
export const LOCALES: readonly Locale[] = ["en", "ro"];

const muiLocales = { en: enUS, ro: roRO } as const;

/**
 * The explorer theme: palette, typography, shape and component defaults.
 * The locale only selects MUI's own built-in strings (table pagination, etc.);
 * app copy lives in the app's bilingual catalogue, never here.
 */
export function createGriveiTheme(locale: Locale = "en"): Theme {
  return createTheme(
    {
      palette: {
        primary: { main: "#1f4e79" },
        secondary: { main: "#9a5b13" },
        background: { default: "#f7f8fa", paper: "#ffffff" },
      },
      shape: { borderRadius: 6 },
      typography: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        button: { textTransform: "none", fontWeight: 600 },
      },
      components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
        MuiChip: { defaultProps: { size: "small" } },
        MuiTable: { defaultProps: { size: "small" } },
        MuiTooltip: { defaultProps: { arrow: true } },
        MuiTabs: { defaultProps: { variant: "scrollable", scrollButtons: "auto" } },
        MuiCard: { defaultProps: { variant: "outlined" } },
        MuiLink: { defaultProps: { underline: "hover" } },
      },
    },
    muiLocales[locale],
  );
}
