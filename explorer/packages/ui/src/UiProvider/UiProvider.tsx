import { useMemo, type ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import "../fonts/fonts.css";
import { createGriveiTheme, type Locale } from "../theme/theme.ts";

export interface UiProviderProps {
  /** Selects MUI's built-in strings (e.g. "Rows per page"). Defaults to English. */
  locale?: Locale;
  children?: ReactNode;
}

/** App root: applies the theme and CssBaseline (dark ground, dot grid), loads the bundled fonts, and sets the locale for MUI's own strings. */
export function UiProvider({ locale = "en", children }: UiProviderProps) {
  const theme = useMemo(() => createGriveiTheme(locale), [locale]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
